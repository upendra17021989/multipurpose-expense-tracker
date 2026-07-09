package com.app.service;

import com.app.dto.SystemSettingsDto;
import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class SystemSettingsService {
    private static final String SITE_NAME = "site_name";
    private static final String SUPPORT_EMAIL = "support_email";
    private static final String MAINTENANCE_NOTICE = "maintenance_notice";
    private final SystemSettingRepository settings;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public SystemSettingsDto get() {
        Map<String, String> values = settings.findAll().stream()
                .collect(Collectors.toMap(SystemSetting::getKey, SystemSetting::getValue));
        return SystemSettingsDto.builder().siteName(values.getOrDefault(SITE_NAME, "Expense Tracker"))
                .supportEmail(values.getOrDefault(SUPPORT_EMAIL, ""))
                .maintenanceNotice(values.getOrDefault(MAINTENANCE_NOTICE, "")).build();
    }

    @Transactional
    public SystemSettingsDto update(Long actorId, SystemSettingsDto request) {
        User actor = users.findById(actorId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        save(SITE_NAME, request.getSiteName().trim(), actor);
        save(SUPPORT_EMAIL, clean(request.getSupportEmail()), actor);
        save(MAINTENANCE_NOTICE, clean(request.getMaintenanceNotice()), actor);
        return get();
    }

    private void save(String key, String value, User actor) {
        SystemSetting setting = settings.findById(key).orElseGet(() -> SystemSetting.builder().key(key).build());
        setting.setValue(value); setting.setUpdatedBy(actor); setting.setUpdatedAt(LocalDateTime.now());
        settings.save(setting);
    }
    private String clean(String value) { return value == null ? "" : value.trim(); }
}
