package me.qoofix.easycapes.mixin;

import com.mojang.blaze3d.vertex.PoseStack;
import me.qoofix.easycapes.client.EasyCapesClient;
import net.minecraft.client.renderer.SubmitNodeCollector;
import net.minecraft.client.renderer.entity.layers.CapeLayer;
import net.minecraft.client.renderer.entity.state.AvatarRenderState;
import net.minecraft.core.ClientAsset;
import net.minecraft.world.entity.player.PlayerSkin;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(CapeLayer.class)
public class CapeLayerMixin {
    @Inject(
            method = "submit(Lcom/mojang/blaze3d/vertex/PoseStack;Lnet/minecraft/client/renderer/SubmitNodeCollector;ILnet/minecraft/client/renderer/entity/state/AvatarRenderState;FF)V",
            at = @At("HEAD")
    )
    private void easycapes$customCapeTexture(PoseStack poseStack, SubmitNodeCollector collector, int light, AvatarRenderState state, float partialTick, float bob, CallbackInfo ci) {
        ClientAsset.Texture custom = EasyCapesClient.capeAssetFor(state);
        if (custom != null) {
            PlayerSkin skin = state.skin;
            state.skin = new PlayerSkin(skin.body(), custom, skin.elytra(), skin.model(), skin.secure());
            state.showCape = true;
        }
    }
}
