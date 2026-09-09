package com.app.service;
import com.app.dto.SocietyAgencyDtos.*;
import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class SocietyAgencyService {
 private final AccountRepository accounts; private final SocietyAgencyRepository agencies; private final SocietyAgencyWorkerRepository workers;
 @Transactional(readOnly=true) public List<AgencyDto> list(Long accountId){ society(accountId); return agencies.findByAccountIdAndActiveTrueOrderByNameAsc(accountId).stream().map(a->map(a,true)).toList(); }
 @Transactional public AgencyDto create(Long accountId,AgencyRequest r){ Account a=society(accountId); validateDates(r); return map(agencies.save(SocietyAgency.builder().account(a).name(r.getName().trim()).serviceCategory(r.getServiceCategory().trim()).contactPerson(clean(r.getContactPerson())).phone(clean(r.getPhone())).email(clean(r.getEmail())).contractStart(r.getContractStart()).contractEnd(r.getContractEnd()).requiredHeadcount(r.getRequiredHeadcount()==null?0:r.getRequiredHeadcount()).build()),true); }
 @Transactional public AgencyDto update(Long accountId,Long id,AgencyRequest r){ SocietyAgency a=agency(accountId,id); validateDates(r); a.setName(r.getName().trim());a.setServiceCategory(r.getServiceCategory().trim());a.setContactPerson(clean(r.getContactPerson()));a.setPhone(clean(r.getPhone()));a.setEmail(clean(r.getEmail()));a.setContractStart(r.getContractStart());a.setContractEnd(r.getContractEnd());a.setRequiredHeadcount(r.getRequiredHeadcount()==null?0:r.getRequiredHeadcount());return map(agencies.save(a),true); }
 @Transactional public void delete(Long accountId,Long id){ SocietyAgency a=agency(accountId,id);a.setActive(false);agencies.save(a);workers.findByAccountIdAndAgencyIdAndActiveTrueOrderByWorkerNameAsc(accountId,id).forEach(w->{w.setActive(false);workers.save(w);}); }
 @Transactional public WorkerDto addWorker(Long accountId,Long agencyId,WorkerRequest r){ SocietyAgency a=agency(accountId,agencyId); return mapWorker(workers.save(SocietyAgencyWorker.builder().account(a.getAccount()).agency(a).workerName(r.getWorkerName().trim()).workerCode(clean(r.getWorkerCode())).designation(clean(r.getDesignation())).mobile(clean(r.getMobile())).build())); }
 @Transactional public WorkerDto updateWorker(Long accountId,Long agencyId,Long id,WorkerRequest r){ agency(accountId,agencyId); SocietyAgencyWorker w=workers.findByAccountIdAndAgencyIdAndIdAndActiveTrue(accountId,agencyId,id).orElseThrow(()->new ResourceNotFoundException("Agency worker not found"));w.setWorkerName(r.getWorkerName().trim());w.setWorkerCode(clean(r.getWorkerCode()));w.setDesignation(clean(r.getDesignation()));w.setMobile(clean(r.getMobile()));return mapWorker(workers.save(w)); }
 @Transactional public void deleteWorker(Long accountId,Long agencyId,Long id){ agency(accountId,agencyId);SocietyAgencyWorker w=workers.findByAccountIdAndAgencyIdAndIdAndActiveTrue(accountId,agencyId,id).orElseThrow(()->new ResourceNotFoundException("Agency worker not found"));w.setActive(false);workers.save(w); }
 private Account society(Long id){return accounts.findById(id).filter(a->a.getAccountType()==AccountType.SOCIETY&&Boolean.TRUE.equals(a.getActive())).orElseThrow(()->new ResourceNotFoundException("Society not found"));}
 private SocietyAgency agency(Long accountId,Long id){society(accountId);return agencies.findByAccountIdAndIdAndActiveTrue(accountId,id).orElseThrow(()->new ResourceNotFoundException("Agency not found"));}
 private void validateDates(AgencyRequest r){if(r.getContractStart()!=null&&r.getContractEnd()!=null&&r.getContractEnd().isBefore(r.getContractStart()))throw new ValidationException("Contract end cannot be before contract start");}
 private AgencyDto map(SocietyAgency a,boolean includeWorkers){return AgencyDto.builder().id(a.getId()).name(a.getName()).serviceCategory(a.getServiceCategory()).contactPerson(a.getContactPerson()).phone(a.getPhone()).email(a.getEmail()).contractStart(a.getContractStart()).contractEnd(a.getContractEnd()).requiredHeadcount(a.getRequiredHeadcount()).workers(includeWorkers?workers.findByAccountIdAndAgencyIdAndActiveTrueOrderByWorkerNameAsc(a.getAccount().getId(),a.getId()).stream().map(this::mapWorker).toList():List.of()).build();}
 private WorkerDto mapWorker(SocietyAgencyWorker w){return WorkerDto.builder().id(w.getId()).agencyId(w.getAgency().getId()).workerName(w.getWorkerName()).workerCode(w.getWorkerCode()).designation(w.getDesignation()).mobile(w.getMobile()).build();}
 private String clean(String s){return s==null||s.isBlank()?null:s.trim();}
}
