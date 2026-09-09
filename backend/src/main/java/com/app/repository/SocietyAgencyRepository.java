package com.app.repository;
import com.app.entity.SocietyAgency;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SocietyAgencyRepository extends JpaRepository<SocietyAgency,Long>{
 List<SocietyAgency> findByAccountIdAndActiveTrueOrderByNameAsc(Long accountId);
 Optional<SocietyAgency> findByAccountIdAndIdAndActiveTrue(Long accountId,Long id);
}
