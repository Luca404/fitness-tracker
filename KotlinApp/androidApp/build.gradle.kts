import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.isFile) file.inputStream().use { load(it) }
}

fun authSetting(name: String, default: String = ""): String =
    (providers.environmentVariable(name).orNull ?: localProperties.getProperty(name, default)).trim()

fun String.buildConfigString(): String = "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "it.trackrs.fittrackr"
    compileSdk = 37
    defaultConfig {
        applicationId = "it.trackrs.fittrackr"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1"
        buildConfigField("String", "SUPABASE_URL", authSetting("SUPABASE_URL").buildConfigString())
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", authSetting("SUPABASE_PUBLISHABLE_KEY").buildConfigString())
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", authSetting("GOOGLE_WEB_CLIENT_ID").buildConfigString())
        buildConfigField(
            "String", "AUTH_WEB_URL",
            authSetting("FITTRACKR_WEB_URL", "https://fitness-tracker-delta-kohl.vercel.app").buildConfigString(),
        )
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation(project(":shared"))
    implementation(platform("androidx.compose:compose-bom:2025.12.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.12.2")
    implementation("androidx.navigation:navigation-compose:2.9.6")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("io.github.jan-tennert.supabase:auth-kt:3.3.0")
    implementation("io.github.jan-tennert.supabase:postgrest-kt:3.3.0")
    implementation("io.ktor:ktor-client-okhttp:3.3.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
}
