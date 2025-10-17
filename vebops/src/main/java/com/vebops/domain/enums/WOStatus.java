package com.vebops.domain.enums;
public enum WOStatus {
    /**
     * Newly created work order that has not yet been assigned to any field
     * engineer or team.  This is the default state immediately after the WO
     * is created from a service request.
     */
    NEW,

    /**
     * The work order has been allocated to a field engineer or team but the
     * job has not yet been accepted.  Assignments may still be modified
     * while in this state.
     */
    ASSIGNED,

    /**
     * A field engineer has accepted the assignment and work is underway.
     * Materials may be issued and progress updates are expected.  Once
     * started, reassignment requires administrative override.
     */
    IN_PROGRESS,

    /**
     * The work is temporarily paused.  Reasons may include pending
     * procurement, site readiness issues or customer requested holds.  While
     * on hold no further progress updates should be recorded until the hold
     * is released.
     */
    ON_HOLD,

    /**
     * The work order has been cancelled prior to completion.  Stock
     * reservations should be released and any issued materials returned to
     * inventory.  A cancellation reason should be captured at the time of
     * transition.
     */
    CANCELLED,

    /**
     * The work order has been fully executed and all associated tasks have
     * been completed.  Completion triggers invoice generation.
     */
    COMPLETED
}
