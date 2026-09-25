package com.app.repository;

import com.app.entity.FestivalCouponSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FestivalCouponSettingRepository extends JpaRepository<FestivalCouponSetting, Long> {
    Optional<FestivalCouponSetting> findByAccountIdAndFestivalEventId(Long accountId, Long festivalEventId);
}
