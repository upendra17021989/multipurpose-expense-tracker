package com.app.dto;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
@Data public class AcceptStaffInvitationRequest { @NotBlank private String invitationCode; }
