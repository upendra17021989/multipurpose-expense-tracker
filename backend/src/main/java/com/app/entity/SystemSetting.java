package com.app.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "system_settings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemSetting {
    @Id @Column(name = "setting_key", length = 80) private String key;
    @Column(name = "setting_value", nullable = false, length = 1000) private String value;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "updated_by") private User updatedBy;
    @Builder.Default @Column(nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
}
