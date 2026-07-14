package com.app.repository;
import com.app.entity.SocietyAnnualCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface SocietyAnnualCollectionRepository extends JpaRepository<SocietyAnnualCollection, Long> {
    List<SocietyAnnualCollection> findByAccountIdAndFinancialYearOrderByPaymentDateDescIdDesc(Long accountId, String financialYear);
    List<SocietyAnnualCollection> findByAccountIdAndFinancialYearAndFlatIdOrderByPaymentDateDescIdDesc(Long accountId, String financialYear, Long flatId);
    Optional<SocietyAnnualCollection> findByAccountIdAndId(Long accountId, Long id);
}
