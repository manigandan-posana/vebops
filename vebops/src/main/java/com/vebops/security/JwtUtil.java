package com.vebops.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;                 // IMPORTANT: SecretKey (not java.security.Key)
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

public class JwtUtil {
    private final SecretKey key;
    private final long ttlMillis;

    public JwtUtil(String secret, long ttlMillis) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttlMillis = ttlMillis;
    }

    /** Existing convenience – build from fields */
    public String generate(Long uid, Long tid, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(uid))
                .claim("uid", uid)
                .claim("tid", tid)
                .claim("role", role)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(key)                // alg inferred for HMAC
                .compact();
    }

    /** Overload – your controller can pass a claims map */
    public String generate(Map<String, Object> claims) {
        long now = System.currentTimeMillis();
        var b = Jwts.builder()
                .claims(claims)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(key);
        if (!claims.containsKey("sub") && claims.get("uid") != null) {
            b.subject(String.valueOf(claims.get("uid")));
        }
        return b.compact();
    }

    /** Parse to Claims (JJWT 0.12.6 flow) */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)              // expects SecretKey
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
