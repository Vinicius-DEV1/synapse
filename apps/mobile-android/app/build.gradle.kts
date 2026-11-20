plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val repositoryRoot = rootProject.projectDir.parentFile.parentFile
val pinnedNdkVersion = file("../ndk.version").readText().trim()
val buildSynapseAndroidBridge by tasks.registering(Exec::class) {
    group = "build"
    description = "Builds the Synapse Rust bridge for Android and generates UniFFI Kotlin bindings."
    commandLine("bash", repositoryRoot.resolve("tools/scripts/build-android.sh").absolutePath)
    inputs.files(
        repositoryRoot.resolve("Cargo.lock"),
        repositoryRoot.resolve("Cargo.toml"),
        repositoryRoot.resolve("core/synapse-core/Cargo.toml"),
        repositoryRoot.resolve("bridges/bridge-uniffi/Cargo.toml"),
        repositoryRoot.resolve("bridges/bridge-uniffi/uniffi.toml"),
        repositoryRoot.resolve("tools/scripts/build-android.sh"),
        file("../ndk.version"),
    )
    inputs.dir(repositoryRoot.resolve("core/synapse-core/src"))
    inputs.dir(repositoryRoot.resolve("bridges/bridge-uniffi/src"))
    outputs.dir(layout.buildDirectory.dir("generated/jniLibs/main"))
    outputs.dir(layout.buildDirectory.dir("generated/source/uniffi/main/java"))
}

tasks.named("preBuild") {
    dependsOn(buildSynapseAndroidBridge)
}

val generatedJniLibs = layout.buildDirectory.dir("generated/jniLibs/main")
val generatedUniFfiKotlin = layout.buildDirectory.dir("generated/source/uniffi/main/java")

android {
    namespace = "com.synapse"
    compileSdk = 35
    ndkVersion = pinnedNdkVersion

    defaultConfig {
        applicationId = "com.synapse.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 200
        versionName = "2.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk {
            abiFilters.addAll(listOf("arm64-v8a", "x86_64", "armeabi-v7a"))
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    sourceSets {
        getByName("main") {
            java.srcDir(generatedUniFfiKotlin)
            jniLibs.srcDir(generatedJniLibs)
        }
    }
}

dependencies {
    // Jetpack Compose & Material 3
    val composeBom = platform("androidx.compose:compose-bom:2024.10.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Activity & Navigation
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Media3 / ExoPlayer for Hardware Decoded Media
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
    implementation("androidx.media3:media3-common:1.4.1")

    // JNA for UniFFI bindings
    implementation("net.java.dev.jna:jna:5.14.0@aar")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

