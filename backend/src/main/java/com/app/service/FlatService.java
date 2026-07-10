package com.app.service;

import com.app.dto.FlatCreateRequest;
import com.app.dto.FlatDto;
import com.app.dto.FlatImportDtos;
import com.app.entity.Account;
import com.app.entity.AccountType;
import com.app.entity.Flat;
import com.app.entity.ResidentType;
import com.app.exception.ResourceNotFoundException;
import com.app.exception.ValidationException;
import com.app.repository.AccountRepository;
import com.app.repository.FlatRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FlatService {
    private static final long MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

    private final FlatRepository flatRepository;
    private final AccountRepository accountRepository;

    public FlatService(FlatRepository flatRepository, AccountRepository accountRepository) {
        this.flatRepository = flatRepository;
        this.accountRepository = accountRepository;
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

    public FlatImportDtos.Preview previewImport(Long accountId, MultipartFile file) {
        societyAccount(accountId);
        validateImportFile(file);
        List<FlatImportDtos.Row> rows = parseCsv(file, accountId);
        if (rows.isEmpty()) throw new ValidationException("No flat rows were found in the CSV file");
        int ready = (int) rows.stream().filter(row -> row.getErrors().isEmpty() && !row.isDuplicate()).count();
        int warnings = (int) rows.stream().filter(row -> !row.getWarnings().isEmpty() || !row.getErrors().isEmpty()).count();
        int duplicates = (int) rows.stream().filter(FlatImportDtos.Row::isDuplicate).count();
        return FlatImportDtos.Preview.builder()
                .fileName(file.getOriginalFilename())
                .totalRows(rows.size())
                .readyRows(ready)
                .warningRows(warnings)
                .duplicateRows(duplicates)
                .rows(rows)
                .build();
    }

    @Transactional
    public FlatImportDtos.Result confirmImport(Long accountId, FlatImportDtos.ConfirmRequest request) {
        Account account = societyAccount(accountId);
        List<FlatImportDtos.RowResult> results = new ArrayList<>();
        int created = 0;
        int skipped = 0;

        for (FlatImportDtos.Row row : Optional.ofNullable(request.getRows()).orElse(List.of())) {
            List<String> errors = validateImportRow(row);
            if (!errors.isEmpty()) {
                skipped++;
                results.add(importResult(row, null, "SKIPPED", String.join("; ", errors)));
                continue;
            }
            if (flatRepository.findByAccountIdAndBlockNameIgnoreCaseAndFlatNumberIgnoreCaseAndActiveTrue(
                    accountId, row.getBlockName().trim(), row.getFlatNumber().trim()).isPresent()) {
                skipped++;
                results.add(importResult(row, null, "SKIPPED", "Flat already exists"));
                continue;
            }
            Flat saved = flatRepository.save(Flat.builder()
                    .account(account)
                    .blockName(row.getBlockName().trim())
                    .flatNumber(row.getFlatNumber().trim())
                    .ownerName(row.getOwnerName().trim())
                    .mobile(clean(row.getMobile()))
                    .email(clean(row.getEmail()))
                    .residentType(row.getResidentType() == null ? ResidentType.OWNER : row.getResidentType())
                    .active(true)
                    .build());
            created++;
            results.add(importResult(row, saved.getId(), "CREATED", "Imported"));
        }
        return FlatImportDtos.Result.builder().created(created).skipped(skipped).rows(results).build();
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

    private Account societyAccount(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ValidationException("Account not found"));
        if (account.getAccountType() != AccountType.SOCIETY) {
            throw new ValidationException("Flat import is available only for society accounts");
        }
        return account;
    }

    private void validateImportFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ValidationException("Select a CSV file to import");
        if (file.getSize() > MAX_IMPORT_FILE_SIZE) throw new ValidationException("CSV file must be 5 MB or smaller");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        if (!name.endsWith(".csv")) throw new ValidationException("Only .csv files are supported");
    }

    private List<FlatImportDtos.Row> parseCsv(MultipartFile file, Long accountId) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<List<String>> csvRows = readCsv(reader);
            if (csvRows.isEmpty()) throw new ValidationException("The CSV file is empty");
            Map<String, Integer> headers = headers(csvRows.get(0));
            requireHeaders(headers, "blockname", "flatnumber", "ownername");
            List<FlatImportDtos.Row> rows = new ArrayList<>();
            for (int index = 1; index < csvRows.size(); index++) {
                List<String> csvRow = csvRows.get(index);
                if (csvRow.stream().allMatch(value -> value == null || value.isBlank())) continue;
                FlatImportDtos.Row row = importRow(index + 1, csvRow, headers, accountId);
                rows.add(row);
            }
            return rows;
        } catch (IOException ex) {
            throw new ValidationException("Unable to read the CSV file", ex);
        }
    }

    private FlatImportDtos.Row importRow(int rowNumber, List<String> values, Map<String, Integer> headers, Long accountId) {
        String blockName = value(values, headers.get("blockname"));
        String flatNumber = value(values, headers.get("flatnumber"));
        String ownerName = value(values, headers.get("ownername"));
        String mobile = value(values, headers.get("mobile"));
        String email = value(values, headers.get("email"));
        ResidentType residentType = residentType(value(values, headers.get("residenttype")));
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (blockName == null) errors.add("Block name is required");
        if (flatNumber == null) errors.add("Flat number is required");
        if (ownerName == null) errors.add("Owner name is required");
        if (residentType == null) {
            residentType = ResidentType.OWNER;
            warnings.add("Resident type defaulted to OWNER");
        }
        boolean duplicate = blockName != null && flatNumber != null && flatRepository
                .findByAccountIdAndBlockNameIgnoreCaseAndFlatNumberIgnoreCaseAndActiveTrue(accountId, blockName, flatNumber)
                .isPresent();
        if (duplicate) warnings.add("Flat already exists and will be skipped");
        return FlatImportDtos.Row.builder()
                .rowNumber(rowNumber)
                .blockName(blockName)
                .flatNumber(flatNumber)
                .ownerName(ownerName)
                .mobile(mobile)
                .email(email)
                .residentType(residentType)
                .duplicate(duplicate)
                .warnings(warnings)
                .errors(errors)
                .build();
    }

    private List<String> validateImportRow(FlatImportDtos.Row row) {
        List<String> errors = new ArrayList<>();
        if (row == null) {
            errors.add("Row is empty");
            return errors;
        }
        if (clean(row.getBlockName()) == null) errors.add("Block name is required");
        if (clean(row.getFlatNumber()) == null) errors.add("Flat number is required");
        if (clean(row.getOwnerName()) == null) errors.add("Owner name is required");
        return errors;
    }

    private FlatImportDtos.RowResult importResult(FlatImportDtos.Row row, Long flatId, String status, String message) {
        return FlatImportDtos.RowResult.builder()
                .rowNumber(row != null ? row.getRowNumber() : null)
                .flatId(flatId)
                .status(status)
                .message(message)
                .build();
    }

    private Map<String, Integer> headers(List<String> row) {
        Map<String, Integer> headers = new HashMap<>();
        for (int index = 0; index < row.size(); index++) {
            headers.put(row.get(index).trim().replaceAll("[^A-Za-z0-9]", "").toLowerCase(Locale.ROOT), index);
        }
        return headers;
    }

    private void requireHeaders(Map<String, Integer> headers, String... required) {
        List<String> missing = List.of(required).stream().filter(header -> !headers.containsKey(header)).toList();
        if (!missing.isEmpty()) throw new ValidationException("Missing required column(s): " + String.join(", ", missing));
    }

    private List<List<String>> readCsv(BufferedReader reader) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        List<String> current = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean quoted = false;
        int value;
        while ((value = reader.read()) != -1) {
            char ch = (char) value;
            if (quoted) {
                if (ch == '"') {
                    reader.mark(1);
                    int next = reader.read();
                    if (next == '"') cell.append('"');
                    else {
                        quoted = false;
                        if (next != -1) reader.reset();
                    }
                } else cell.append(ch);
            } else if (ch == '"') quoted = true;
            else if (ch == ',') {
                current.add(cell.toString());
                cell.setLength(0);
            } else if (ch == '\n') {
                current.add(cell.toString());
                rows.add(current);
                current = new ArrayList<>();
                cell.setLength(0);
            } else if (ch != '\r') cell.append(ch);
        }
        if (cell.length() > 0 || !current.isEmpty()) {
            current.add(cell.toString());
            rows.add(current);
        }
        return rows;
    }

    private String value(List<String> values, Integer index) {
        if (index == null || index >= values.size()) return null;
        return clean(values.get(index));
    }

    private String clean(String value) {
        if (value == null) return null;
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private ResidentType residentType(String value) {
        if (value == null) return null;
        try {
            return ResidentType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
