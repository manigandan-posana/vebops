package com.vebops.service;

import com.vebops.dto.LoginRequest;
import com.vebops.dto.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest req);
}
