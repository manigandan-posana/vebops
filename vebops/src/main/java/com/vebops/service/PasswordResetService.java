package com.vebops.service;

/**
 * Service for handling password reset requests and token validation. Creates
 * secure reset tokens, sends reset emails and updates the user's password
 * after validation. Implementations must hide whether a user account exists
 * for a given email to prevent information disclosure.
 */
public interface PasswordResetService {
    /**
     * Initiates the forgot-password flow for the given email. If a user
     * account exists a reset token will be generated and an email will be
     * dispatched. Regardless of whether an account exists this method
     * completes silently.
     *
     * @param email email address of the account requesting reset
     */
    void requestPasswordReset(String email);

    /**
     * Resets a user's password using a previously generated reset token.
     *
     * @param token the reset token that was emailed to the user
     * @param newPassword the new password to set on the account
     */
    void resetPassword(String token, String newPassword);
}