package me.qoofix.easycapes.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.User;

import java.security.SecureRandom;

public class SessionAuth {
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String tryJoinServer(Minecraft client) {
        try {
            User user = client.getUser();
            String serverId = randomHex(16);
            client.services().sessionService().joinServer(user.getProfileId(), user.getAccessToken(), serverId);
            return serverId;
        } catch (Exception e) {
            return null;
        }
    }

    private static String randomHex(int bytes) {
        byte[] buf = new byte[bytes];
        RANDOM.nextBytes(buf);
        StringBuilder sb = new StringBuilder(bytes * 2);
        for (byte b : buf) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
