package com.vebops.domain.enums;
public enum WOProgressStatus {
    /**
     * A new work order has been allocated to a field engineer or team but
     * has not yet been acknowledged.  This status typically corresponds to
     * the WorkOrder transitioning to the ASSIGNED state.
     */
    ASSIGNED,

    /**
     * The field engineer has accepted the assigned work order but has not
     * begun the installation or site work.  Accepting confirms receipt of
     * the task in the mobile app.
     */
    ACCEPTED,

    /**
     * The engineer has arrived on site and begun work.  This kicks off the
     * installation or site servicing time tracking.
     */
    STARTED,

    /**
     * The required materials for the work order have been received by the
     * engineer at the site.  For supply flows this should follow an
     * inventory issue.
     */
    MATERIAL_RECEIVED,

    /**
     * Installation or erection activities have commenced.  This is separate
     * from STARTED to allow for phases such as site preparation.
     */
    INSTALLATION_STARTED,

    /**
     * All work activities are finished and the site is ready for handover.
     */
    COMPLETED
}
