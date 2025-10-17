package com.vebops.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.vebops.context.TenantContext;
import com.vebops.domain.EmailTemplate;
import com.vebops.domain.Invoice;
import com.vebops.domain.Subscription;
import com.vebops.domain.Tenant;
import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.enums.InvoiceStatus;
import com.vebops.domain.enums.RoleCode;
import com.vebops.domain.enums.SubscriptionStatus;
import com.vebops.domain.enums.FEStatus;
import com.vebops.dto.DashboardSummary;
import com.vebops.dto.UpdateUserRequest;
import com.vebops.dto.UpdateTenantRequest;
import com.vebops.dto.admin.AdminSummaryResponse;
import com.vebops.dto.admin.BackOfficeProfileResponse;
import com.vebops.dto.admin.ExtendSubscriptionRequest;
import com.vebops.dto.admin.ImpersonateRequest;
import com.vebops.dto.admin.ImpersonateResponse;
import com.vebops.dto.admin.InviteUserRequest;
import com.vebops.dto.admin.PageResponse;
import com.vebops.dto.admin.RenderTemplateRequest;
import com.vebops.dto.admin.ResetPasswordRequest;
import com.vebops.dto.admin.RevenueSeriesResponse;
import com.vebops.dto.admin.RoleChangeRequest;
import com.vebops.dto.admin.SubscriptionBreakdownResponse;
import com.vebops.dto.admin.SystemHealthResponse;
import com.vebops.dto.admin.TenantListItem;
import com.vebops.dto.admin.TenantProfileResponse;
import com.vebops.dto.admin.UpdateBackOfficeProfileRequest;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.EmailTemplateRepository;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.RoleRepository;
import com.vebops.repository.SubscriptionRepository;
import com.vebops.repository.TenantRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import com.vebops.security.JwtUtil;
import com.vebops.service.impl.AdminEntityDeletionService;
import com.vebops.service.impl.TenantDeletionService;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Service class encapsulating all administrative operations previously housed in
 * {@link com.vebops.web.AdminController}. Moving the business logic into
 * this service allows controller methods to remain thin and free of
 * transactional or persistence concerns. Each method below mirrors a
 * corresponding endpoint in the AdminController. Where a controller
 * previously declared {@code @Transactional}, the annotation has been
 * transferred here to ensure proper transaction boundaries at the service
 * layer. ResponseEntity wrappers are returned so that controllers may
 * delegate HTTP status and body handling directly to this service.
 */
@Service
public class AdminService {

    private final TenantRepository tenantRepo;
    private final SubscriptionRepository subRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final PasswordEncoder encoder;
    private final InvoiceRepository invoiceRepo;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;
    private final EmailTemplateRepository emailTemplateRepo;
    private final DashboardService dashboard;
    private final CustomerRepository customers;
    private final FieldEngineerRepository feRepo;
    private final TenantDeletionService tenantDeletionService;
    private final AdminEntityDeletionService deletions;

    public AdminService(TenantRepository tenantRepo,
                        SubscriptionRepository subRepo,
                        UserRepository userRepo,
                        RoleRepository roleRepo,
                        UserRoleRepository userRoleRepo,
                        PasswordEncoder encoder,
                        InvoiceRepository invoiceRepo,
                        EmailService emailService,
                        JwtUtil jwtUtil,
                        EmailTemplateRepository emailTemplateRepo,
                        DashboardService dashboard,
                        CustomerRepository customers,
                        FieldEngineerRepository feRepo,
                        TenantDeletionService tenantDeletionService,
                        AdminEntityDeletionService deletions) {
        this.tenantRepo = tenantRepo;
        this.subRepo = subRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.encoder = encoder;
        this.invoiceRepo = invoiceRepo;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
        this.emailTemplateRepo = emailTemplateRepo;
        this.dashboard = dashboard;
        this.customers = customers;
        this.feRepo = feRepo;
        this.tenantDeletionService = tenantDeletionService;
        this.deletions = deletions;
    }

    // ---------- User management ----------

    @Transactional
    public ResponseEntity<Void> updateUser(Long id, UpdateUserRequest req) {
        User u = userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        if (req.displayName != null && !req.displayName.isBlank()) {
            u.setDisplayName(req.displayName);
        }
        if (req.email != null && !req.email.isBlank()) {
            u.setEmail(req.email);
        }
        if (req.active != null) {
            u.setActive(req.active);
        }
        userRepo.save(u);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> disableUser(Long id) {
        User u = userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        u.setActive(false);
        userRepo.save(u);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Long> upsertSubscription(com.vebops.dto.UpdateSubscriptionRequest req) {
        Tenant t = tenantRepo.findById(req.tenantId).orElseThrow();
        Subscription s = subRepo.findTopByTenant_IdOrderByEndsAtDesc(t.getId()).orElse(null);
        if (s == null) {
            s = new Subscription();
            s.setTenant(t);
        }
        s.setStartsAt(req.startsAt);
        s.setEndsAt(req.endsAt);
        s.setStatus(req.status);
        subRepo.save(s);
        return ResponseEntity.ok(s.getId());
    }

    @Transactional
    public ResponseEntity<Long> createBackOfficeUser(com.vebops.dto.CreateBackOfficeUserRequest req) {
        Tenant t = tenantRepo.findByCode(req.code).orElseGet(() -> {
            Tenant nt = new Tenant();
            nt.setCode(req.code);
            nt.setName(req.name);
            nt.setActive(true);
            return tenantRepo.save(nt);
        });
        String rawPwd = com.vebops.util.Passwords.generate(12);
        User u = new User();
        u.setDisplayName(req.displayName);
        u.setEmail(req.email);
        u.setPasswordHash(encoder.encode(rawPwd));
        u.setActive(true);
        userRepo.save(u);
        roleRepo.findByCode(RoleCode.BACK_OFFICE).orElseGet(() -> {
            var r = new com.vebops.domain.Role();
            r.setCode(RoleCode.BACK_OFFICE);
            r.setName("Back Office");
            return roleRepo.save(r);
        });
        UserRole ur = new UserRole();
        ur.setUser(u);
        ur.setTenantId(t.getId());
        ur.setRoleCode(RoleCode.BACK_OFFICE);
        ur.setPrimaryRole(true);
        userRoleRepo.save(ur);
        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserCredentials(
                t.getId(), u.getId(), u.getEmail(),
                u.getDisplayName(), "Back Office",
                u.getEmail(), rawPwd
            );
        }
        return ResponseEntity.ok(u.getId());
    }

    public ResponseEntity<List<User>> listUsers() {
        return ResponseEntity.ok(userRepo.findAll());
    }

    @Transactional
    public ResponseEntity<Tenant> updateTenant(Long id, UpdateTenantRequest req) {
        Tenant t = tenantRepo.findById(id).orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (req.code != null && !req.code.isBlank()) {
            t.setCode(req.code);
        }
        if (req.name != null && !req.name.isBlank()) {
            t.setName(req.name);
        }
        if (req.active != null) {
            t.setActive(req.active);
        }
        tenantRepo.save(t);
        return ResponseEntity.ok(t);
    }

    public ResponseEntity<AdminSummaryResponse> adminDashboardSummary() {
        AdminSummaryResponse res = new AdminSummaryResponse();
        res.totalTenants = tenantRepo.count();
        res.activeUsers  = userRepo.countByActiveTrue();
        Instant cutoff = Instant.now().minus(Duration.ofDays(30));
        res.signups30d = tenantRepo.countByCreatedAtAfter(cutoff);
        long active = 0L, inactive = 0L;
        List<Long> tenantIds = tenantRepo.findAll().stream().map(Tenant::getId).toList();
        for (Long tid : tenantIds) {
            Subscription latest = subRepo.findTopByTenant_IdOrderByEndsAtDesc(tid).orElse(null);
            if (latest != null && latest.getStatus() == SubscriptionStatus.ACTIVE) active++;
            else inactive++;
        }
        res.subscriptions.active = active;
        res.subscriptions.inactive = Math.max(inactive, 0);
        LocalDate firstDay = YearMonth.now().atDay(1);
        Instant mtdCutoff = firstDay.atStartOfDay(ZoneId.systemDefault()).toInstant();
        BigDecimal revenue = invoiceRepo.sumTotalByStatusAndCreatedAtAfter(InvoiceStatus.PAID, mtdCutoff);
        res.revenueMTD = revenue != null ? revenue : BigDecimal.ZERO;
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<SubscriptionBreakdownResponse> subscriptionBreakdown() {
        SubscriptionBreakdownResponse res = new SubscriptionBreakdownResponse();
        long active = 0L, inactive = 0L;
        List<Long> tenantIds = tenantRepo.findAll().stream().map(Tenant::getId).toList();
        for (Long tid : tenantIds) {
            Subscription latest = subRepo.findTopByTenant_IdOrderByEndsAtDesc(tid).orElse(null);
            if (latest != null && latest.getStatus() == SubscriptionStatus.ACTIVE) active++;
            else inactive++;
        }
        res.active = active;
        res.inactive = Math.max(inactive, 0);
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<Long> tenantSignups(int sinceDays) {
        int days = Math.max(0, Math.min(sinceDays, 365));
        Instant cutoff = Instant.now().minus(Duration.ofDays(days));
        long count = tenantRepo.countByCreatedAtAfter(cutoff);
        return ResponseEntity.ok(count);
    }

    public ResponseEntity<SystemHealthResponse> systemHealth() {
        SystemHealthResponse res = new SystemHealthResponse();
        try {
            String implVersion = Optional.ofNullable(getClass().getPackage().getImplementationVersion()).orElse(null);
            res.version = implVersion != null ? implVersion : System.getProperty("app.version", "unknown");
        } catch (Exception ignore) {
            res.version = "unknown";
        }
        try {
            tenantRepo.count();
            res.database = "UP";
        } catch (Exception ex) {
            res.database = "DOWN";
            res.status = "DOWN";
            res.details.put("dbError", ex.getMessage());
            return ResponseEntity.ok(res);
        }
        res.status = "UP";
        return ResponseEntity.ok(res);
    }

    @Transactional
    public ResponseEntity<Long> inviteUser(InviteUserRequest req) {
        Tenant t = tenantRepo.findById(req.tenantId).orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (userRepo.existsByEmail(req.email)) {
            User existing = userRepo.findByEmail(req.email).orElseThrow();
            if (!userRoleRepo.existsByUser_IdAndTenantIdAndRoleCode(existing.getId(), t.getId(), req.role)) {
                UserRole ur = new UserRole();
                ur.setUser(existing);
                ur.setTenantId(t.getId());
                ur.setRoleCode(req.role);
                ur.setPrimaryRole(Boolean.TRUE.equals(req.primaryRole));
                userRoleRepo.save(ur);
            }
            return ResponseEntity.ok(existing.getId());
        }
        String rawPwd = com.vebops.util.Passwords.generate(12);
        User u = new User();
        u.setDisplayName(req.displayName);
        u.setEmail(req.email);
        u.setPasswordHash(encoder.encode(rawPwd));
        u.setActive(true);
        userRepo.save(u);
        if (!userRoleRepo.existsByUser_IdAndTenantIdAndRoleCode(u.getId(), t.getId(), req.role)) {
            UserRole ur = new UserRole();
            ur.setUser(u);
            ur.setTenantId(t.getId());
            ur.setRoleCode(req.role);
            ur.setPrimaryRole(Boolean.TRUE.equals(req.primaryRole));
            userRoleRepo.save(ur);
        }
        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserCredentials(
                t.getId(), u.getId(), u.getEmail(),
                u.getDisplayName(), req.role.name().replace('_', ' '),
                u.getEmail(), rawPwd
            );
        }
        return ResponseEntity.ok(u.getId());
    }

    @Transactional
    public ResponseEntity<Map<String, String>> resetPassword(Long id, ResetPasswordRequest body) {
        User u = userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        String rawPwd = com.vebops.util.Passwords.generate(12);
        u.setPasswordHash(encoder.encode(rawPwd));
        userRepo.save(u);
        boolean send = body == null || body.sendEmail == null || body.sendEmail.booleanValue();
        if (send && u.getEmail() != null && !u.getEmail().isBlank()) {
            var urs = userRoleRepo.findByUser_Id(u.getId());
            String roleLabel = urs.isEmpty() ? "User" : urs.get(0).getRoleCode().name().replace('_',' ');
            Long tid = urs.isEmpty() ? 0L : urs.get(0).getTenantId();
            emailService.sendUserCredentials(tid, u.getId(), u.getEmail(), u.getDisplayName(), roleLabel, u.getEmail(), rawPwd);
        }
        Map<String, String> resp = new HashMap<>();
        resp.put("tempPassword", rawPwd);
        return ResponseEntity.ok(resp);
    }

    @Transactional
    public ResponseEntity<Void> addRole(Long id, RoleChangeRequest req) {
        userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        tenantRepo.findById(req.tenantId).orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (!userRoleRepo.existsByUser_IdAndTenantIdAndRoleCode(id, req.tenantId, req.role)) {
            UserRole ur = new UserRole();
            User u = new User(); u.setId(id);
            ur.setUser(u);
            ur.setTenantId(req.tenantId);
            ur.setRoleCode(req.role);
            ur.setPrimaryRole(Boolean.TRUE.equals(req.primary));
            userRoleRepo.save(ur);
        }
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> removeRole(Long id, Long tenantId, RoleCode role) {
        var urs = userRoleRepo.findByUser_IdAndTenantId(id, tenantId);
        for (UserRole ur : urs) {
            if (ur.getRoleCode() == role) userRoleRepo.delete(ur);
        }
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Long> extendSubscription(ExtendSubscriptionRequest req) {
        if (req.days <= 0) throw new IllegalArgumentException("days must be > 0");
        Subscription s = subRepo.findTopByTenant_IdOrderByEndsAtDesc(req.tenantId)
                .orElseThrow(() -> new NotFoundException("Subscription not found"));
        s.setEndsAt(s.getEndsAt().plusDays(req.days));
        subRepo.save(s);
        return ResponseEntity.ok(s.getId());
    }

    public ResponseEntity<RevenueSeriesResponse> revenueSeries(int months) {
        int m = Math.max(1, Math.min(months, 24));
        var cutoff = YearMonth.now().minusMonths(m - 1).atDay(1)
                    .atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        var all = invoiceRepo.findAll();
        var buckets = new LinkedHashMap<YearMonth, java.math.BigDecimal>();
        for (int i = 0; i < m; i++) buckets.put(YearMonth.now().minusMonths(m - 1 - i), java.math.BigDecimal.ZERO);
        for (Invoice inv : all) {
            if (inv.getStatus() == InvoiceStatus.PAID && inv.getCreatedAt().isAfter(cutoff)) {
                var ym = YearMonth.from(inv.getCreatedAt().atZone(java.time.ZoneId.systemDefault()));
                buckets.put(ym, buckets.getOrDefault(ym, java.math.BigDecimal.ZERO)
                                        .add(inv.getTotal() == null ? java.math.BigDecimal.ZERO : inv.getTotal()));
            }
        }
        var res = new RevenueSeriesResponse();
        for (var e : buckets.entrySet()) {
            var mt = new RevenueSeriesResponse.MonthTotal();
            mt.year = e.getKey().getYear();
            mt.month = e.getKey().getMonthValue();
            mt.total = e.getValue();
            res.items.add(mt);
        }
        return ResponseEntity.ok(res);
    }

    public ResponseEntity<byte[]> exportUsersCsv() {
        StringBuilder sb = new StringBuilder("id,displayName,email,active,createdAt\n");
        for (User u : userRepo.findAll()) {
            sb.append(u.getId()).append(',')
            .append(escape(u.getDisplayName())).append(',')
            .append(escape(u.getEmail())).append(',')
            .append(u.isActive()).append(',')
            .append(u.getCreatedAt()).append('\n');
        }
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users.csv")
            .contentType(MediaType.TEXT_PLAIN)
            .body(bytes);
    }

    public ResponseEntity<byte[]> exportTenantsCsv() {
        StringBuilder sb = new StringBuilder("id,code,name,active,createdAt\n");
        for (Tenant t : tenantRepo.findAll()) {
            sb.append(t.getId()).append(',')
            .append(escape(t.getCode())).append(',')
            .append(escape(t.getName())).append(',')
            .append(t.isActive()).append(',')
            .append(t.getCreatedAt()).append('\n');
        }
        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tenants.csv")
            .contentType(MediaType.TEXT_PLAIN)
            .body(bytes);
    }

    public ResponseEntity<List<EmailTemplate>> listTemplates(Long tenantId) {
        return ResponseEntity.ok(emailTemplateRepo.findByTenantId(tenantId));
    }

    @Transactional
    public ResponseEntity<Long> upsertTemplate(com.vebops.dto.admin.UpsertEmailTemplateRequest req) {
        EmailTemplate tpl = emailTemplateRepo.findByTenantIdAndCode(req.tenantId, req.code)
                .orElseGet(() -> {
                    EmailTemplate t = new EmailTemplate();
                    t.setTenantId(req.tenantId);
                    t.setCode(req.code);
                    return t;
                });
        tpl.setSubject(req.subject);
        tpl.setBodyWithVars(req.bodyWithVars);
        emailTemplateRepo.save(tpl);
        return ResponseEntity.ok(tpl.getId());
    }

    public ResponseEntity<String> renderTemplate(RenderTemplateRequest req) {
        String html = emailService.renderTemplate(
            req.tenantId, req.code,
            req.vars == null ? java.util.Map.of() : req.vars,
            Boolean.TRUE.equals(req.viaAi)
        );
        return ResponseEntity.ok(html);
    }

    public ResponseEntity<ImpersonateResponse> impersonate(ImpersonateRequest req) {
        String token = jwtUtil.generate(req.userId, req.tenantId, req.role.name());
        return ResponseEntity.ok(new ImpersonateResponse(token));
    }

    public ResponseEntity<DashboardSummary> tenantSummary() {
        Long tenantId = TenantContext.getTenantId();
        return ResponseEntity.ok(dashboard.getTenantSummary(tenantId));
    }

    public ResponseEntity<PageResponse<TenantListItem>> listTenantsPaged(int page, int size, String q, Boolean active, String sub, String sort) {
        String field = "name";
        String dir = "asc";
        if (sort != null) {
            String[] sp = sort.split(",", 2);
            String f = (sp.length > 0 ? sp[0].trim().toLowerCase() : "");
            String d = (sp.length > 1 ? sp[1].trim().toLowerCase() : "");
            if (List.of("name", "code", "id").contains(f)) field = f;
            if (List.of("asc", "desc").contains(d)) dir = d;
        }
        PageRequest pr = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<TenantRepository.TenantRowProjection> p = tenantRepo.searchTenantsWithLatest(q, active, sub, field, dir, pr);
        List<TenantListItem> items = p.getContent().stream().map(row -> {
            TenantListItem dto = new TenantListItem();
            dto.id = row.getId();
            dto.code = row.getCode();
            dto.name = row.getName();
            dto.active = Boolean.TRUE.equals(row.getActive());
            dto.latestStatus = row.getLatestStatus();
            dto.latestStartsAt = row.getLatestStartsAt();
            dto.latestEndsAt = row.getLatestEndsAt();
            dto.backOfficeUserId = row.getBackOfficeUserId();
            dto.backOfficeEmail = row.getBackOfficeEmail();
            dto.backOfficeDisplayName = row.getBackOfficeDisplayName();
            dto.email = row.getBackOfficeEmail();
            return dto;
        }).toList();
        PageResponse<TenantListItem> resp = new PageResponse<>(items, p.getNumber(), p.getSize(), p.getTotalElements());
        return ResponseEntity.ok(resp);
    }

    public ResponseEntity<TenantProfileResponse> getTenantById(Long id) {
        Tenant t = tenantRepo.findById(id).orElseThrow(() -> new NotFoundException("Tenant not found"));
        TenantProfileResponse r = new TenantProfileResponse();
        r.id = t.getId();
        r.code = t.getCode();
        r.name = t.getName();
        r.active = t.isActive();
        r.createdAt = t.getCreatedAt();
        var latest = subRepo.findTopByTenant_IdOrderByEndsAtDesc(t.getId()).orElse(null);
        if (latest != null) {
            TenantProfileResponse.LatestSubscription s = new TenantProfileResponse.LatestSubscription();
            s.id = latest.getId();
            s.status = latest.getStatus() == null ? null : latest.getStatus().name();
            s.startsAt = latest.getStartsAt();
            s.endsAt = latest.getEndsAt();
            r.latestSubscription = s;
        }
        return ResponseEntity.ok(r);
    }

    public ResponseEntity<?> listTenantMembers(Long tenantId, String kind, int page, int size, String q, Boolean hasPortal, String status, String sort) {
        Sort.Direction dir = (StringUtils.hasText(sort) && sort.toLowerCase().endsWith(",asc"))
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        String prop = (StringUtils.hasText(sort) ? sort.split(",", 2)[0].trim() : "id");
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, Math.min(200, size)), Sort.by(dir, prop));
        String qq = q == null ? "" : q.trim().toLowerCase();
        boolean hasQ = StringUtils.hasText(qq);
        if ("customers".equals(kind)) {
            Page<com.vebops.domain.Customer> base;
            if (hasQ) {
                boolean looksEmail = qq.contains("@");
                boolean looksMobile = qq.chars().allMatch(Character::isDigit);
                if (looksEmail) {
                    base = customers.findByTenantIdAndEmailIgnoreCase(tenantId, q.trim(), pageable);
                    return ResponseEntity.ok(base.map(com.vebops.dto.CustomerDto::from));
                } else if (looksMobile) {
                    base = customers.findByTenantIdAndMobile(tenantId, q.trim(), pageable);
                    return ResponseEntity.ok(base.map(com.vebops.dto.CustomerDto::from));
                } else {
                    var allByName = customers.findByTenantIdAndNameContainingIgnoreCase(tenantId, q.trim());
                    Comparator<com.vebops.domain.Customer> cmp = "name".equalsIgnoreCase(prop)
                            ? Comparator.comparing(c -> String.valueOf(c.getName()).toLowerCase())
                            : Comparator.comparing(com.vebops.domain.Customer::getId);
                    if (dir == Sort.Direction.DESC) cmp = cmp.reversed();
                    allByName.sort(cmp);
                    int from = Math.min(page * size, allByName.size());
                    int to = Math.min(from + size, allByName.size());
                    var slice = allByName.subList(from, to).stream().map(com.vebops.dto.CustomerDto::from).toList();
                    return ResponseEntity.ok(new PageImpl<>(slice, pageable, allByName.size()));
                }
            }
            if (Boolean.TRUE.equals(hasPortal)) {
                base = customers.findByTenantIdAndPortalUserIsNotNull(tenantId, pageable);
            } else if (Boolean.FALSE.equals(hasPortal)) {
                base = customers.findByTenantIdAndPortalUserIsNull(tenantId, pageable);
            } else {
                base = customers.findByTenantId(tenantId, pageable);
            }
            return ResponseEntity.ok(base.map(com.vebops.dto.CustomerDto::from));
        }
        FEStatus feStatus = null;
        if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
            try { feStatus = FEStatus.valueOf(status.toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }
        if (hasQ) {
            java.util.List<com.vebops.domain.FieldEngineer> list = (feStatus == null)
                    ? feRepo.findByTenantId(tenantId)
                    : feRepo.findByTenantIdAndStatus(tenantId, feStatus);
            list.forEach(fe -> { if (fe.getUser() != null) { fe.getUser().getDisplayName(); fe.getUser().getEmail(); } });
            var filtered = list.stream().filter(fe -> {
                var u = fe.getUser();
                String name = u != null && u.getDisplayName() != null ? u.getDisplayName().toLowerCase() : "";
                String email2 = u != null && u.getEmail() != null ? u.getEmail().toLowerCase() : "";
                return name.contains(qq) || email2.contains(qq);
            }).collect(Collectors.toList());
            Comparator<com.vebops.domain.FieldEngineer> cmp = Comparator.comparing(com.vebops.domain.FieldEngineer::getId);
            if (dir == Sort.Direction.DESC) cmp = cmp.reversed();
            filtered.sort(cmp);
            int from = Math.min(page * size, filtered.size());
            int to = Math.min(from + size, filtered.size());
            var slice = filtered.subList(from, to).stream().map(com.vebops.dto.FieldEngineerDto::from).toList();
            return ResponseEntity.ok(new PageImpl<>(slice, pageable, filtered.size()));
        } else {
            Page<com.vebops.domain.FieldEngineer> base = (feStatus == null)
                    ? feRepo.findByTenantId(tenantId, pageable)
                    : feRepo.findByTenantIdAndStatus(tenantId, feStatus, pageable);
            return ResponseEntity.ok(base.map(com.vebops.dto.FieldEngineerDto::from));
        }
    }

    @Transactional
    public ResponseEntity<BackOfficeProfileResponse> updateBackOfficeProfile(Long userId, UpdateBackOfficeProfileRequest req) {
        User u = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        Long tenantId = req.tenantId;
        if (tenantId == null) {
            List<UserRole> roles = userRoleRepo.findByUser_Id(userId);
            UserRole backoffice = roles.stream()
                    .filter(r -> r.getRoleCode() == RoleCode.BACK_OFFICE)
                    .sorted(Comparator.comparing(UserRole::isPrimaryRole).reversed())
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("User has no BACK_OFFICE role; cannot resolve tenant"));
            tenantId = backoffice.getTenantId();
        }
        Tenant t = tenantRepo.findById(tenantId)
                .orElseThrow(() -> new NotFoundException("Tenant not found"));
        if (req.code != null && !req.code.isBlank()) {
            String newCode = req.code.trim();
            Optional<Tenant> existingByCode = tenantRepo.findByCode(newCode);
            if (existingByCode.isPresent() && !existingByCode.get().getId().equals(t.getId())) {
                throw new BusinessException("Tenant code already in use");
            }
            t.setCode(newCode);
        }
        if (req.name != null && !req.name.isBlank()) {
            t.setName(req.name.trim());
        }
        tenantRepo.save(t);
        if (req.displayName != null && !req.displayName.isBlank()) {
            u.setDisplayName(req.displayName.trim());
        }
        if (req.email != null && !req.email.isBlank()) {
            String newEmail = req.email.trim();
            Optional<User> existingByEmail = userRepo.findByEmail(newEmail);
            if (existingByEmail.isPresent() && !existingByEmail.get().getId().equals(u.getId())) {
                throw new BusinessException("Email already in use");
            }
            u.setEmail(newEmail);
        }
        userRepo.save(u);
        BackOfficeProfileResponse body = new BackOfficeProfileResponse(
                u.getId(),
                t.getId(),
                t.getCode(),
                t.getName(),
                u.getDisplayName(),
                u.getEmail()
        );
        return ResponseEntity.ok(body);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Long>> previewTenantDeletion(Long tenantId) {
        return ResponseEntity.ok(tenantDeletionService.dryRun(tenantId));
    }

    public ResponseEntity<Void> deleteTenant(Long tenantId, boolean deleteOrphanUsers) {
        tenantDeletionService.purgeTenant(tenantId, deleteOrphanUsers);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> deleteCustomer(Long customerId, boolean deletePortalUserIfOrphan) {
        deletions.deleteCustomerCascade(customerId, deletePortalUserIfOrphan);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> deleteFieldEngineer(Long feId, boolean deleteUserIfOrphan) {
        deletions.deleteFieldEngineer(feId, deleteUserIfOrphan);
        return ResponseEntity.noContent().build();
    }

    private static String escape(String s) {
        if (s == null) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}