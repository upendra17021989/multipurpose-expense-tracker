package com.app.service;

import com.app.dto.ApproveSocietyMembershipRequest;
import com.app.entity.*;
import com.app.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SocietyMembershipServiceTest {
    @Mock AccountRepository accounts;
    @Mock AccountUserMembershipRepository memberships;
    @Mock UserRepository users;
    @Mock FlatRepository flats;
    @Mock FlatMemberRepository flatMembers;
    SocietyMembershipService service;

    @BeforeEach
    void setUp() {
        service = new SocietyMembershipService(accounts, memberships, users, flats, flatMembers);
    }

    @Test
    void approvalCreatesFlatMemberWithRequiredDefaults() {
        User admin = User.builder().id(1L).name("Admin").build();
        User member = User.builder().id(2L).name("New Member").mobile("9999999999").build();
        Account society = Account.builder().id(7L).accountType(AccountType.SOCIETY).role(UserRole.ADMIN).user(admin).build();
        Flat flat = Flat.builder().id(12L).account(society).blockName("L Block").flatNumber("403").build();
        AccountUserMembership membership = AccountUserMembership.builder().id(20L).account(society).user(member).role(UserRole.MEMBER).active(false).build();
        ApproveSocietyMembershipRequest request = new ApproveSocietyMembershipRequest();
        request.setFlatId(12L);
        request.setRelation("Resident");

        when(accounts.findById(7L)).thenReturn(Optional.of(society));
        when(memberships.findById(20L)).thenReturn(Optional.of(membership));
        when(flats.findByAccountIdAndIdAndActiveTrue(7L, 12L)).thenReturn(Optional.of(flat));
        when(flatMembers.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberships.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.approve(7L, 1L, 20L, request);

        ArgumentCaptor<FlatMember> captor = ArgumentCaptor.forClass(FlatMember.class);
        verify(flatMembers).save(captor.capture());
        assertThat(captor.getValue().getActive()).isTrue();
        assertThat(captor.getValue().getCreatedAt()).isNotNull();
        assertThat(captor.getValue().getUpdatedAt()).isNotNull();
        assertThat(membership.getActive()).isTrue();
        assertThat(membership.getRequestedBlockName()).isEqualTo("L Block");
        assertThat(membership.getRequestedFlatNumber()).isEqualTo("403");
        assertThat(membership.getRequestedRelation()).isEqualTo("Resident");
    }

    @Test
    void approvedMemberCanViewSocietyMemberLedger() {
        User owner = User.builder().id(1L).name("Admin").build();
        User viewer = User.builder().id(2L).name("Viewer").build();
        Account society = Account.builder().id(7L).accountType(AccountType.SOCIETY).role(UserRole.ADMIN).user(owner).build();
        AccountUserMembership viewerMembership = AccountUserMembership.builder().id(20L).account(society).user(viewer).role(UserRole.MEMBER).active(true).build();

        when(accounts.findById(7L)).thenReturn(Optional.of(society));
        when(memberships.findByAccountIdAndUserIdAndActiveTrue(7L, 2L)).thenReturn(Optional.of(viewerMembership));
        when(memberships.findByAccountIdAndActiveTrueOrderByCreatedAtAsc(7L)).thenReturn(List.of(viewerMembership));

        assertThat(service.members(7L, 2L)).hasSize(1);
    }
}
