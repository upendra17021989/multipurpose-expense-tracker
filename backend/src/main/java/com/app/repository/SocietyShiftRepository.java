package com.app.repository; import com.app.entity.SocietyShift; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface SocietyShiftRepository extends JpaRepository<SocietyShift,Long>{List<SocietyShift> findByAccountIdAndActiveTrueOrderByStartTimeAsc(Long accountId);Optional<SocietyShift> findByAccountIdAndIdAndActiveTrue(Long accountId,Long id);}
