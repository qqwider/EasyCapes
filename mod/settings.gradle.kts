pluginManagement {
    repositories {
        mavenCentral()
        gradlePluginPortal()
        maven("https://maven.fabricmc.net/") { name = "Fabric" }
        maven("https://maven.neoforged.net/releases/") { name = "NeoForged" }
        maven("https://maven.minecraftforge.net/") { name = "MinecraftForge" }
        maven("https://repo.spongepowered.org/repository/maven-public/") { name = "Sponge" }
        maven("https://maven.kikugie.dev/releases") { name = "KikuGie Releases" }
        maven("https://maven.kikugie.dev/snapshots") { name = "KikuGie Snapshots" }
    }
}

plugins {
    id("dev.kikugie.stonecutter") version "0.9.8"
    id("dev.kikugie.loom-back-compat") version "0.4.2"
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
    id("net.neoforged.moddev.repositories") version "2.0.141"
    id("net.neoforged.moddev") version "2.0.141" apply false
}

stonecutter {
    create(rootProject) {
        fun match(version: String, vararg loaders: String) =
            loaders.forEach { version("$version-$it", version).buildscript = "build.$it.gradle.kts" }

        match("1.21.11", "fabric", "neoforge")

        vcsVersion = "1.21.11-fabric"
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
        maven("https://maven.minecraftforge.net/") { name = "MinecraftForge" }
        maven("https://maven.neoforged.net/releases/") { name = "NeoForged" }
        maven("https://repo.spongepowered.org/repository/maven-public/") { name = "Sponge" }
    }
}

rootProject.name = "EasyCapes"
