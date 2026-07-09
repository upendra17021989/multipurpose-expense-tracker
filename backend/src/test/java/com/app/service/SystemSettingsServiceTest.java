package com.app.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.app.dto.SystemSettingsDto;
import com.app.entity.*;
import com.app.repository.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class SystemSettingsServiceTest {
    @Test
    void updatesOnlyWhitelistedNonSecretSettings() {
        SystemSettingRepository settings = mock(SystemSettingRepository.class);
        UserRepository users = mock(UserRepository.class);
        when(users.findById(4L)).thenReturn(Optional.of(User.builder().id(4L).name("Admin").build()));
        when(settings.findById(any())).thenReturn(Optional.empty());
        when(settings.findAll()).thenReturn(List.of());
        SystemSettingsService service = new SystemSettingsService(settings, users);
        SystemSettingsDto request = SystemSettingsDto.builder().siteName("  My Tracker  ")
                .supportEmail(" support@example.com ").maintenanceNotice(" Planned work ").build();

        service.update(4L, request);

        verify(settings, times(3)).save(any(SystemSetting.class));
        verify(settings).save(argThat(setting -> setting.getKey().equals("site_name")
                && setting.getValue().equals("My Tracker") && setting.getUpdatedBy().getId().equals(4L)));
    }
}
