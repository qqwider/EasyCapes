package me.qoofix.easycapes.client;

import net.minecraft.core.ClientAsset;
import net.minecraft.resources.Identifier;

public record EasyCapeAsset(Identifier texture) implements ClientAsset.Texture {
    @Override
    public Identifier id() {
        return texture;
    }

    @Override
    public Identifier texturePath() {
        return texture;
    }
}
