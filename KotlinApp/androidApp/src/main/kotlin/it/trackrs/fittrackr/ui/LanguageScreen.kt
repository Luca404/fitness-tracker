package it.trackrs.fittrackr.ui

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import it.trackrs.fittrackr.R
import java.util.Locale
import org.xmlpull.v1.XmlPullParser

@Composable
private fun supportedLocales(): List<Locale> {
    val resources = LocalContext.current.resources
    return remember(resources) {
        resources.getXml(R.xml.app_locales).use { parser ->
            buildList {
                while (parser.next() != XmlPullParser.END_DOCUMENT) {
                    if (parser.eventType == XmlPullParser.START_TAG && parser.name == "locale") {
                        add(Locale.forLanguageTag(parser.getAttributeValue("http://schemas.android.com/apk/res/android", "name")))
                    }
                }
            }
        }
    }
}

@Composable
internal fun appContentLocale(): Locale {
    val supported = supportedLocales()
    val preferred = LocalConfiguration.current.locales
    for (index in 0 until preferred.size()) {
        supported.firstOrNull { it.language == preferred[index].language }?.let { return it }
    }
    return supported.first()
}

@Composable
internal fun LanguageScreen() {
    var selected by remember { mutableStateOf(AppCompatDelegate.getApplicationLocales().toLanguageTags()) }
    val choices = listOf("" to stringResource(R.string.device_language)) + supportedLocales().map { locale ->
        locale.toLanguageTag() to locale.getDisplayName(locale).replaceFirstChar { it.titlecase(locale) }
    }
    PageBody(stringResource(R.string.language)) {
        Column(Modifier.selectableGroup()) {
            choices.forEach { (tag, label) ->
                val checked = tag == selected
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp).selectable(
                        selected = checked, role = Role.RadioButton,
                        onClick = {
                            selected = tag
                            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(tag))
                        },
                    ),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = checked, onClick = null)
                    Spacer(Modifier.width(12.dp))
                    Text(label)
                }
            }
        }
    }
}
