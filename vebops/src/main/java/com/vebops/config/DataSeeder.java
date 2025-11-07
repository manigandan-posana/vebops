package com.vebops.config;

import com.vebops.domain.Tenant;
import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.enums.RoleCode;
import com.vebops.repository.TenantRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seed(TenantRepository tenants,
                           UserRepository users,
                           UserRoleRepository userRoles,
                           PasswordEncoder encoder) {
        return args -> {
            // Tenant
            Tenant t = tenants.findByCode("default")
                    .orElseGet(() -> {
                        Tenant nt = new Tenant();
                        nt.setCode("default");
                        nt.setName("Default Tenant");
                        nt.setActive(true);
                        return tenants.save(nt);
                    });

            // Admin user
            User admin = users.findByEmail("admin@vebops.com")
                    .orElseGet(() -> {
                        User u = new User();
                        u.setDisplayName("Admin");
                        u.setEmail("admin@vebops.com");
                        u.setPasswordHash(encoder.encode("vebops"));
                        u.setActive(true);
                        return users.save(u);
                    });

            // Admin role mapping (primary)
            boolean exists = userRoles.existsByUser_IdAndTenantIdAndRoleCode(admin.getId(), t.getId(), RoleCode.ADMIN);
            if (!exists) {
                UserRole ur = new UserRole();
                ur.setUser(admin);
                ur.setTenantId(t.getId());
                ur.setRoleCode(RoleCode.ADMIN);
                ur.setPrimaryRole(true);
                userRoles.save(ur);
            }
        };
    }
}
