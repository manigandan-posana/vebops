package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.ServiceRequest;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    Optional<ServiceRequest> findByTenantIdAndSrn(Long tenantId, String srn);
    /**
     * Returns all service requests for the given tenant.  When implementing
     * manual pagination in a controller this method allows fetching the full
     * set of service requests which can then be sorted and paged as needed.
     *
     * @param tenantId the tenant id to filter by
     * @return a list of service requests belonging to the tenant
     */
    List<ServiceRequest> findByTenantId(Long tenantId);

    /**
     * Returns all service requests for a tenant filtered by status.  This
     * overload is used by the back office listing endpoint when a specific
     * status is provided.  Spring Data automatically derives the query from
     * the method name.
     *
     * @param tenantId the tenant id
     * @param status the desired service request status
     * @return list of service requests matching the tenant and status
     */
    List<ServiceRequest> findByTenantIdAndStatus(Long tenantId, SRStatus status);

    /**
     * Returns all service requests for a tenant filtered by customer id.  This
     * method is useful to find all requests submitted by a particular
     * customer within a tenant.  The underlying query selects rows where
     * ServiceRequest.tenantId matches the provided tenantId and
     * ServiceRequest.customer.id matches the given customerId.
     *
     * @param tenantId the tenant id
     * @param customerId the customer id
     * @return list of service requests for the customer within the tenant
     */
    List<ServiceRequest> findByTenantIdAndCustomer_Id(Long tenantId, Long customerId);

    /**
     * Returns the most recent service request created from the given proposal if
     * one exists.  The combination of tenantId and proposal id is unique because
     * a proposal can only belong to a single tenant.  Using Optional allows the
     * service layer to short‑circuit duplicate creation attempts when a proposal
     * is approved multiple times (for example, due to retries from the UI).
     */
    Optional<ServiceRequest> findFirstByTenantIdAndProposal_Id(Long tenantId, Long proposalId);

    long countByStatus(SRStatus status);

    long countByTenantIdAndStatus(Long tenantId, SRStatus status);
}
