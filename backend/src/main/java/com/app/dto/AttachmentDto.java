package com.app.dto;

import com.app.entity.ReferenceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttachmentDto {
    private Long id;
    private Long accountId;
    private ReferenceType referenceType;
    private Long referenceId;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private String uploadedBy;
    private LocalDateTime createdAt;
}
