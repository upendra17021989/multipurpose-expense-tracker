package com.app.repository;

import com.app.entity.SocietyAttendance;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SocietyAttendanceRepository extends JpaRepository<SocietyAttendance, Long> {
    List<SocietyAttendance> findByAccountIdAndAttendanceDate(Long accountId, LocalDate date);

    @EntityGraph(attributePaths = {
            "rosterAssignment",
            "rosterAssignment.shift",
            "rosterAssignment.staff",
            "rosterAssignment.agencyWorker",
            "rosterAssignment.agencyWorker.agency",
            "replacementAgencyWorker"
    })
    List<SocietyAttendance> findByAccountIdAndAttendanceDateBetweenOrderByAttendanceDateAsc(
            Long accountId, LocalDate from, LocalDate to);

    Optional<SocietyAttendance> findByRosterAssignmentIdAndAttendanceDate(Long rosterId, LocalDate date);
    Optional<SocietyAttendance> findByAccountIdAndId(Long accountId, Long id);
}
