package com.app.repository;
import com.app.entity.SocietyAgencyWorker;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SocietyAgencyWorkerRepository extends JpaRepository<SocietyAgencyWorker,Long>{
 List<SocietyAgencyWorker> findByAccountIdAndAgencyIdAndActiveTrueOrderByWorkerNameAsc(Long accountId,Long agencyId);
 Optional<SocietyAgencyWorker> findByAccountIdAndAgencyIdAndIdAndActiveTrue(Long accountId,Long agencyId,Long id);
 Optional<SocietyAgencyWorker> findByAccountIdAndIdAndActiveTrue(Long accountId,Long id);
}
