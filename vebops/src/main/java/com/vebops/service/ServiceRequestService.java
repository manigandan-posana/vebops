package com.vebops.service;

import com.vebops.domain.ServiceRequest;

public interface ServiceRequestService {
    ServiceRequest createFromApprovedProposal(Long tenantId, Long proposalId);

    /**
     * Creates a service request directly without a proposal. This is used for
     * service types that do not require a proposal (INSTALL_ONLY or ERECTION).
     * After the service request is created a corresponding work order should
     * also be created by the caller.
     *
     * @param tenantId the tenant id
     * @param customerId the customer performing the work
     * @param serviceType the type of service requested
     * @return the persisted service request
     */
    ServiceRequest createWithoutProposal(Long tenantId, Long customerId, com.vebops.domain.enums.ServiceTypeCode serviceType);
}
