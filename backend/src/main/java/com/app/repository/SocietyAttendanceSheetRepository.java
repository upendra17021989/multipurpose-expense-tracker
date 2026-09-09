package com.app.repository; import com.app.entity.SocietyAttendanceSheet; import org.springframework.data.jpa.repository.JpaRepository; import java.time.LocalDate; import java.util.Optional;
public interface SocietyAttendanceSheetRepository extends JpaRepository<SocietyAttendanceSheet,Long>{Optional<SocietyAttendanceSheet> findByAccountIdAndAttendanceDate(Long accountId,LocalDate date);}
