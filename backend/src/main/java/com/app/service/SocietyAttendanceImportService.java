package com.app.service;

import com.app.entity.*;
import com.app.exception.*;
import com.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class SocietyAttendanceImportService {
    private static final Set<String> METHODS=Set.of("QR","BIOMETRIC_IMPORT");
    private static final Set<String> STATUSES=Set.of("PRESENT","ABSENT","LATE","HALF_DAY","ON_LEAVE","WEEKLY_OFF","HOLIDAY","REPLACEMENT","NOT_SCHEDULED");
    private final AccountRepository accounts; private final UserRepository users;
    private final SocietyRosterAssignmentRepository roster; private final SocietyAttendanceRepository attendance;
    private final SocietyAuditEventRepository audit;

    @Transactional
    public int importCsv(Long aid,Long uid,String method,MultipartFile file) {
        Account account=accounts.findById(aid).filter(x->x.getAccountType()==AccountType.SOCIETY&&Boolean.TRUE.equals(x.getActive())).orElseThrow(()->new ResourceNotFoundException("Society not found"));
        User user=users.findById(uid).orElseThrow(()->new ResourceNotFoundException("User not found"));
        String normalized=method==null?"":method.toUpperCase();
        if(!METHODS.contains(normalized)) throw new ValidationException("Method must be QR or BIOMETRIC_IMPORT");
        if(file==null||file.isEmpty()) throw new ValidationException("Choose a CSV file");
        int imported=0,line=0;
        try(BufferedReader reader=new BufferedReader(new InputStreamReader(file.getInputStream(),StandardCharsets.UTF_8))) {
            String value;
            while((value=reader.readLine())!=null) {
                line++;
                if(line==1&&value.toLowerCase().contains("rosterassignmentid")) continue;
                if(value.isBlank()) continue;
                String[] cells=value.split(",",-1);
                if(cells.length<3) throw new ValidationException("CSV line "+line+" requires rosterAssignmentId,date,status");
                Long rosterId=Long.valueOf(cells[0].trim()); LocalDate date=LocalDate.parse(cells[1].trim()); String status=cells[2].trim().toUpperCase();
                if(!STATUSES.contains(status)) throw new ValidationException("Invalid status on CSV line "+line);
                SocietyRosterAssignment assignment=roster.findByAccountIdAndIdAndActiveTrue(aid,rosterId).orElseThrow(()->new ValidationException("Invalid roster assignment in attendance CSV"));
                SocietyAttendance row=attendance.findByRosterAssignmentIdAndAttendanceDate(rosterId,date).orElseGet(()->SocietyAttendance.builder().account(account).rosterAssignment(assignment).attendanceDate(date).build());
                row.setStatus(status); row.setCheckIn(time(cells,3)); row.setCheckOut(time(cells,4)); row.setNotes(cells.length>5&&!cells[5].isBlank()?cells[5].trim():null); row.setRecordingMethod(normalized); row.setRecordedBy(user);
                attendance.save(row); imported++;
            }
        } catch(IOException|NumberFormatException|java.time.format.DateTimeParseException e) {
            throw new ValidationException("Unable to read attendance CSV at line "+line);
        }
        audit.save(SocietyAuditEvent.builder().account(account).actor(user).action("ATTENDANCE_"+normalized).entityType("ATTENDANCE_IMPORT").entityId(aid).details("rows="+imported+", file="+file.getOriginalFilename()).build());
        return imported;
    }
    private LocalTime time(String[] cells,int index){return cells.length>index&&!cells[index].isBlank()?LocalTime.parse(cells[index].trim()):null;}
}
