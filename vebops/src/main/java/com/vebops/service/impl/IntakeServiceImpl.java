package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vebops.service.IntakeService;
import com.vebops.service.TenantGuard;
import com.vebops.repository.IntakeRepository;
import com.vebops.domain.Intake;
import com.vebops.domain.enums.ServiceTypeCode;

@Service
public class IntakeServiceImpl implements IntakeService {

    private final IntakeRepository intakeRepo;
    private final TenantGuard tenantGuard;

    public IntakeServiceImpl(IntakeRepository intakeRepo, TenantGuard tenantGuard) {
        this.intakeRepo = intakeRepo;
        this.tenantGuard = tenantGuard;
    }

    @Override @Transactional
    public Long createFromCall(Long tenantId, String customerName, String email, String mobile, String address, ServiceTypeCode serviceType, String serviceHint) {
        tenantGuard.assertActive(tenantId);
        Intake in = new Intake();
        in.setTenantId(tenantId);
        in.setChannel("CALL");
        in.setCustomerName(customerName);
        in.setEmail(email);
        in.setMobile(mobile);
        in.setAddress(address);
        in.setServiceType(serviceType);
        in.setServiceHint(serviceHint);
        intakeRepo.save(in);
        return in.getId();
    }

    @Override @Transactional
    public Long createFromEmail(Long tenantId, String rawEmail) {
        tenantGuard.assertActive(tenantId);
        String name = find(rawEmail, "(?i)name[:\\s]+(.+)");
        String email = find(rawEmail, "(?i)email[:\\s]+([\\w._%+-]+@[\\w.-]+)");
        String mobile = find(rawEmail, "(?i)(mobile|phone)[:\\s]+([0-9+ -]{7,})");
        String address= find(rawEmail, "(?i)address[:\\s]+(.+)");
        String hint   = find(rawEmail, "(?i)(service|type)[:\\s]+(.+)");
        ServiceTypeCode st = inferServiceType(hint);

        Intake in = new Intake();
        in.setTenantId(tenantId);
        in.setChannel("EMAIL");
        in.setCustomerName(name != null ? name : "Unknown");
        in.setEmail(email);
        in.setMobile(mobile);
        in.setAddress(address);
        in.setServiceType(st);
        in.setServiceHint(hint);
        intakeRepo.save(in);
        return in.getId();
    }

    private static String find(String s, String regex){
        if(s==null) return null;
        var m = java.util.regex.Pattern.compile(regex).matcher(s);
        if(m.find()) return m.group(m.groupCount());
        return null;
    }
    private static ServiceTypeCode inferServiceType(String hint){
        if(hint==null) return null;
        String h = hint.toLowerCase();
        if(h.contains("supply with installation") || h.contains("supply & install")) return ServiceTypeCode.SUPPLY_INSTALL;
        if(h.contains("installation only")) return ServiceTypeCode.INSTALL_ONLY;
        if(h.contains("erection")) return ServiceTypeCode.ERECTION;
        if(h.contains("supply only") || h.contains("supply")) return ServiceTypeCode.SUPPLY;
        return null;
    }
}
