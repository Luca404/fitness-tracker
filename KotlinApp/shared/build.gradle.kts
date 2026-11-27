plugins {
    kotlin("multiplatform")
    id("com.android.kotlin.multiplatform.library")
    kotlin("plugin.serialization")
    id("com.google.devtools.ksp")
    id("androidx.room")
}

kotlin {
    android {
        namespace = "it.trackrs.fittrackr.shared"
        compileSdk = 37
        minSdk = 26
    }
    iosArm64()
    iosSimulatorArm64()

    sourceSets.commonMain.dependencies {
        implementation("androidx.room:room-runtime:2.8.4")
        implementation("androidx.sqlite:sqlite-bundled:2.6.2")
        implementation("org.jetbrains.kotlinx:kotlinx-serialization-core:1.9.0")
    }
}

dependencies {
    add("kspAndroid", "androidx.room:room-compiler:2.8.4")
    add("kspIosArm64", "androidx.room:room-compiler:2.8.4")
    add("kspIosSimulatorArm64", "androidx.room:room-compiler:2.8.4")
}

room { schemaDirectory("$projectDir/schemas") }
