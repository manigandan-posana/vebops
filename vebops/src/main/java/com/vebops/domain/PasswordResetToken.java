package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A token used for resetting a user's password. Each token is linked to a single
 * user and has an expiry timestamp. Once a password has been reset using a
 * token the token is marked as used so it cannot be reused.
 */
@Entity
@Table(name = "password_reset_tokens",
    uniqueConstraints = @UniqueConstraint(name = "uk_reset_token", columnNames = {"token"}),
    indexes = {
        @Index(name = "idx_reset_token_user", columnList = "user_id")
    }
)
public class PasswordResetToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 128)
    private String token;

    @Column(nullable = false)
    private Instant expiry;

    @Column(nullable = false)
    private boolean used = false;

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Instant getExpiry() { return expiry; }
    public void setExpiry(Instant expiry) { this.expiry = expiry; }
    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }
}