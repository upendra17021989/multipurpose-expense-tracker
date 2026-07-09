package com.app.config;

import com.app.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class SystemAdminBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final String bootstrapMobile;

    public SystemAdminBootstrap(UserRepository users,
            @Value("${app.system-admin.bootstrap-mobile:}") String bootstrapMobile) {
        this.users = users;
        this.bootstrapMobile = bootstrapMobile;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(bootstrapMobile)) return;
        users.findByMobile(bootstrapMobile.trim()).ifPresentOrElse(user -> {
            if (!Boolean.TRUE.equals(user.getSystemAdmin())) {
                user.setSystemAdmin(true);
                users.save(user);
                log.warn("Platform administrator bootstrap applied to user ID {}", user.getId());
            }
        }, () -> log.warn("Platform administrator bootstrap mobile did not match an existing user"));
    }
}
