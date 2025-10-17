package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Base class for all persisted entities.  In addition to id and audit
 * timestamps, this class declares common Jackson configuration.  When
 * serializing JPA entities, Hibernate sometimes returns proxies
 * (e.g. ByteBuddyInterceptor) for lazily loaded associations.  Without
 * ignoring these special fields, Jackson will attempt to introspect
 * them which results in an {@link org.springframework.http.converter.HttpMessageConversionException}
 * complaining about {@code ByteBuddyInterceptor}.  By ignoring the
 * {@code hibernateLazyInitializer} and {@code handler} properties we
 * allow serialization to proceed even when associations are still
 * proxies.  See https://stackoverflow.com/a/52754263 for details.
 */
@MappedSuperclass
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public abstract class BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

    public Long getId() { return id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setId(Long id) { this.id = id; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
