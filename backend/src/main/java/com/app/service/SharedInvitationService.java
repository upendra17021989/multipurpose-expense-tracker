package com.app.service;

import com.app.dto.SharedExpenseDtos.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional
public class SharedInvitationService {
  private final SharedGroupInvitationRepository invitations;
  private final SharedExpenseGroupRepository groups;
  private final SharedGroupMemberRepository members;
  private final UserRepository users;

  public InvitationDto invite(Long accountId, Long userId, Long groupId, InvitationRequest request) {
    String mobile = normalize(request.getMobile());
    String email = normalizeEmail(request.getEmail());
    if (mobile == null && email == null) throw new ValidationException("Email or mobile is required");

    SharedExpenseGroup group = groups.findAccessibleById(groupId, accountId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Shared expense group not found"));
    User target = mobile != null ? users.findByMobile(mobile).orElse(null) : users.findByEmail(email).orElse(null);
    if (target != null && target.getId().equals(userId)) throw new ValidationException("You are already in this group");
    if (target != null && members.findByGroupIdAndUserId(groupId, target.getId()).isPresent())
      throw new ValidationException("User is already a group member");
    if (target != null && invitations.existsByGroupIdAndInvitedUserIdAndStatus(groupId, target.getId(), SharedInvitationStatus.PENDING))
      throw new ValidationException("An invitation is already pending");
    if (mobile != null && invitations.existsByGroupIdAndMobileAndStatus(groupId, mobile, SharedInvitationStatus.PENDING))
      throw new ValidationException("An invitation is already pending for this mobile number");

    SharedGroupInvitation invitation = invitations.save(SharedGroupInvitation.builder()
        .group(group).invitedBy(users.findById(userId).orElseThrow()).invitedUser(target)
        .email(target != null ? target.getEmail() : email)
        .mobile(target != null ? target.getMobile() : mobile).build());
    return map(invitation);
  }

  public void inviteForMember(SharedExpenseGroup group, Long invitedByUserId, SharedGroupMember member) {
    String mobile = normalize(member.getMobile());
    if (mobile == null) return;
    if (invitations.existsByGroupIdAndMobileAndStatus(group.getId(), mobile, SharedInvitationStatus.PENDING)) return;
    User target = users.findByMobile(mobile).orElse(null);
    invitations.save(SharedGroupInvitation.builder()
        .group(group).invitedBy(users.findById(invitedByUserId).orElseThrow())
        .invitedUser(target).member(member).email(member.getEmail()).mobile(mobile).build());
  }

  public List<InvitationDto> inbox(Long userId) {
    claimPendingInvitations(users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    expireOldInvitations(userId);
    return invitations.findByInvitedUserIdAndStatusOrderByCreatedAtDesc(userId, SharedInvitationStatus.PENDING)
        .stream().map(this::map).toList();
  }

  public void claimPendingInvitations(User user) {
    String mobile = normalize(user.getMobile());
    if (mobile == null) return;
    invitations.findByMobileAndStatus(mobile, SharedInvitationStatus.PENDING).stream()
        .filter(i -> i.getInvitedUser() == null && i.getExpiresAt().isAfter(LocalDateTime.now()))
        .forEach(i -> i.setInvitedUser(user));
  }

  public InvitationDto respond(Long userId, Long invitationId, boolean accept) {
    SharedGroupInvitation invitation = invitations.findByIdAndInvitedUserIdAndStatus(invitationId, userId, SharedInvitationStatus.PENDING)
        .orElseThrow(() -> new ResourceNotFoundException("Pending invitation not found"));
    if (!invitation.getExpiresAt().isAfter(LocalDateTime.now())) {
      invitation.setStatus(SharedInvitationStatus.EXPIRED);
      throw new ValidationException("Invitation has expired");
    }
    invitation.setStatus(accept ? SharedInvitationStatus.ACCEPTED : SharedInvitationStatus.DECLINED);
    invitation.setRespondedAt(LocalDateTime.now());
    if (accept && invitation.getMember() != null) {
      SharedGroupMember member = invitation.getMember();
      if (member.getUser() != null && !member.getUser().getId().equals(userId))
        throw new ValidationException("This group member is already linked to another user");
      if (members.findByGroupIdAndUserId(invitation.getGroup().getId(), userId).isPresent())
        throw new ValidationException("You are already a group member");
      User user = invitation.getInvitedUser();
      member.setUser(user);
      member.setEmail(user.getEmail());
      member.setMobile(user.getMobile());
      member.setActive(true);
      members.save(member);
    } else if (accept && members.findByGroupIdAndUserId(invitation.getGroup().getId(), userId).isEmpty()) {
      User user = invitation.getInvitedUser();
      members.save(SharedGroupMember.builder().group(invitation.getGroup()).user(user)
          .memberName(user.getName()).email(user.getEmail()).mobile(user.getMobile()).build());
    }
    return map(invitation);
  }

  private void expireOldInvitations(Long userId) {
    invitations.findByInvitedUserIdAndStatusOrderByCreatedAtDesc(userId, SharedInvitationStatus.PENDING).stream()
        .filter(i -> !i.getExpiresAt().isAfter(LocalDateTime.now()))
        .forEach(i -> i.setStatus(SharedInvitationStatus.EXPIRED));
  }
  private String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
  private String normalizeEmail(String value) { String v = normalize(value); return v == null ? null : v.toLowerCase(); }
  private InvitationDto map(SharedGroupInvitation i) { return InvitationDto.builder().id(i.getId()).groupId(i.getGroup().getId()).groupName(i.getGroup().getName()).invitedBy(i.getInvitedBy().getName()).email(i.getEmail()).mobile(i.getMobile()).status(i.getStatus().name()).createdAt(i.getCreatedAt()).expiresAt(i.getExpiresAt()).build(); }
}
