package com.app.service;

import com.app.dto.FlatCreateRequest;
import com.app.dto.FlatDto;
import com.app.entity.Flat;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.FlatRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FlatService {

    private final FlatRepository flatRepository;

    public FlatService(FlatRepository flatRepository) {
        this.flatRepository = flatRepository;
    }

    public List<FlatDto> getFlatsByAccountId(Long accountId) {
        return flatRepository.findByAccountIdAndActiveTrue(accountId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public FlatDto getFlatById(Long accountId, Long flatId) {
        Flat flat = flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, flatId)
                .orElseThrow(() -> new ResourceNotFoundException("Flat not found"));
        return mapToDto(flat);
    }

    public List<FlatDto> getFlatsByBlock(Long accountId, String blockName) {
        return flatRepository.findByAccountIdAndBlockNameAndActiveTrue(accountId, blockName)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public FlatDto createFlat(Long accountId, FlatCreateRequest request) {
        com.app.entity.Account account = new com.app.entity.Account();
        account.setId(accountId);

        Flat flat = Flat.builder()
                .account(account)
                .blockName(request.getBlockName())
                .flatNumber(request.getFlatNumber())
                .ownerName(request.getOwnerName())
                .mobile(request.getMobile())
                .email(request.getEmail())
                .residentType(request.getResidentType())
                .active(true)
                .build();

        Flat savedFlat = flatRepository.save(flat);
        log.info("Flat created with ID: {}", savedFlat.getId());

        return mapToDto(savedFlat);
    }

    public FlatDto updateFlat(Long accountId, Long flatId, FlatCreateRequest request) {
        Flat flat = flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, flatId)
                .orElseThrow(() -> new ResourceNotFoundException("Flat not found"));

        flat.setBlockName(request.getBlockName());
        flat.setFlatNumber(request.getFlatNumber());
        flat.setOwnerName(request.getOwnerName());
        flat.setMobile(request.getMobile());
        flat.setEmail(request.getEmail());
        flat.setResidentType(request.getResidentType());

        Flat updated = flatRepository.save(flat);
        return mapToDto(updated);
    }

    public void deleteFlat(Long accountId, Long flatId) {
        Flat flat = flatRepository.findByAccountIdAndIdAndActiveTrue(accountId, flatId)
                .orElseThrow(() -> new ResourceNotFoundException("Flat not found"));

        flat.setActive(false);
        flatRepository.save(flat);
    }

    private FlatDto mapToDto(Flat flat) {
        return FlatDto.builder()
                .id(flat.getId())
                .accountId(flat.getAccount().getId())
                .blockName(flat.getBlockName())
                .flatNumber(flat.getFlatNumber())
                .ownerName(flat.getOwnerName())
                .mobile(flat.getMobile())
                .email(flat.getEmail())
                .residentType(flat.getResidentType())
                .active(flat.getActive())
                .createdAt(flat.getCreatedAt())
                .build();
    }
}
