package com.vebops.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "team_members",
    uniqueConstraints = @UniqueConstraint(name = "uk_team_member", columnNames = {"tenant_id","team_id","fe_id"}),
    indexes = {
        @Index(name = "idx_team_member_tenant", columnList = "tenant_id"),
        @Index(name = "idx_team_member_team", columnList = "team_id")
    }
)
public class TeamMember extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fe_id", nullable = false)
    private FieldEngineer fieldEngineer;

    public Team getTeam() { return team; }
    public void setTeam(Team team) { this.team = team; }
    public FieldEngineer getFieldEngineer() { return fieldEngineer; }
    public void setFieldEngineer(FieldEngineer fieldEngineer) { this.fieldEngineer = fieldEngineer; }
}
