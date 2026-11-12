#include "notes_code_syntax_highlighter.h"

#include "notes_rich_format.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtGui/QColor>
#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextFormat>

namespace {
enum HighlightState { NoState = -1, BlockComment = 1, MarkupComment, TripleSingleString, TripleDoubleString };

QSet<QString> words(const QString &source) {
    QSet<QString> result;
    for (const QString &word : source.split(QLatin1Char(' '), Qt::SkipEmptyParts)) result.insert(word);
    return result;
}

const QSet<QString> &keywordsFor(const QString &language) {
    static const QSet<QString> javascript = words(QStringLiteral(
        "as async await break case catch class const continue debugger default delete do else export extends "
        "finally for from function get if import in instanceof let new of return set static super switch "
        "this throw try typeof var void while yield interface type enum implements private protected public "
        "readonly namespace declare abstract satisfies keyof infer unknown never"));
    static const QSet<QString> python = words(QStringLiteral(
        "and as assert async await break class continue def del elif else except False finally for from global "
        "if import in is lambda None nonlocal not or pass raise return True try while with yield match case"));
    static const QSet<QString> rust = words(QStringLiteral(
        "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match "
        "mod move mut pub ref return self Self static struct super trait true type unsafe use where while"));
    static const QSet<QString> cFamily = words(QStringLiteral(
        "alignas alignof auto bool break case catch char class const constexpr continue default delete do double "
        "else enum explicit extern false final float for friend if inline int long namespace new noexcept nullptr "
        "operator override private protected public register return short signed sizeof static struct switch template "
        "this throw true try typedef typename union unsigned using virtual void volatile while"));
    static const QSet<QString> go = words(QStringLiteral(
        "break case chan const continue default defer else fallthrough for func go goto if import interface map "
        "package range return select struct switch type var"));
    static const QSet<QString> sql = words(QStringLiteral(
        "add all alter and as asc begin between by case cast check column commit constraint create cross current_date "
        "database default delete desc distinct drop else end exists foreign from full group having in index inner "
        "insert intersect into is join key left like limit natural not null offset on or order outer primary references "
        "right rollback row select set table then transaction union unique update using values view when where with"));
    static const QSet<QString> json = words(QStringLiteral("false null true"));
    static const QSet<QString> markup = words(QStringLiteral(
        "article aside audio body button canvas caption code div footer form h1 h2 h3 h4 h5 h6 head header html "
        "img input label li link main meta nav ol option p script section select source span style table tbody td "
        "textarea th thead title tr ul video"));

    if (language == QStringLiteral("javascript") || language == QStringLiteral("typescript") ||
        language == QStringLiteral("graphql")) return javascript;
    if (language == QStringLiteral("python") || language == QStringLiteral("python-repl")) return python;
    if (language == QStringLiteral("rust")) return rust;
    if (language == QStringLiteral("c") || language == QStringLiteral("cpp") || language == QStringLiteral("c++") ||
        language == QStringLiteral("csharp") || language == QStringLiteral("java") || language == QStringLiteral("kotlin") ||
        language == QStringLiteral("objectivec") || language == QStringLiteral("swift") || language == QStringLiteral("arduino"))
        return cFamily;
    if (language == QStringLiteral("go")) return go;
    if (language == QStringLiteral("sql")) return sql;
    if (language == QStringLiteral("json")) return json;
    if (language == QStringLiteral("html") || language == QStringLiteral("xml") ||
        language == QStringLiteral("php-template")) return markup;
    static const QSet<QString> empty;
    return empty;
}

const QSet<QString> &builtinTypes() {
    static const QSet<QString> types = words(QStringLiteral(
        "bool byte char double float int long number object string void"));
    return types;
}

bool hasHashComments(const QString &language) {
    static const QSet<QString> languages = words(QStringLiteral(
        "bash shell python python-repl ruby r yaml makefile perl ini graphql"));
    return languages.contains(language);
}

bool hasSlashComments(const QString &language) {
    static const QSet<QString> languages = words(QStringLiteral(
        "c cpp c++ csharp css go java javascript jsx json kotlin less objectivec php php-template rust scss swift "
        "typescript tsx vbnet wasm"));
    return languages.contains(language);
}

bool hasMarkupComments(const QString &language) {
    return language == QStringLiteral("html") || language == QStringLiteral("xml") ||
        language == QStringLiteral("php-template");
}

bool isPython(const QString &language) {
    return language == QStringLiteral("python") || language == QStringLiteral("python-repl");
}

bool isSql(const QString &language) { return language == QStringLiteral("sql"); }
bool isMarkup(const QString &language) { return hasMarkupComments(language); }

bool identifierStart(QChar ch) { return ch.isLetter() || ch == QLatin1Char('_') || ch == QLatin1Char('$'); }
bool identifierPart(QChar ch) { return ch.isLetterOrNumber() || ch == QLatin1Char('_') || ch == QLatin1Char('$'); }

} // namespace

NotesCodeSyntaxHighlighter::NotesCodeSyntaxHighlighter(QTextDocument *document)
    : QSyntaxHighlighter(document) {
    keywordFormat_.setForeground(QColor(QStringLiteral("#c4b5fd")));
    stringFormat_.setForeground(QColor(QStringLiteral("#86efac")));
    commentFormat_.setForeground(QColor(QStringLiteral("#8b91a3")));
    commentFormat_.setFontItalic(true);
    numberFormat_.setForeground(QColor(QStringLiteral("#fbbf24")));
    functionFormat_.setForeground(QColor(QStringLiteral("#93c5fd")));
    typeFormat_.setForeground(QColor(QStringLiteral("#67e8f9")));
    additionFormat_.setForeground(QColor(QStringLiteral("#86efac")));
    deletionFormat_.setForeground(QColor(QStringLiteral("#fda4af")));
}

void NotesCodeSyntaxHighlighter::highlightBlock(const QString &text) {
    const QTextBlock block = currentBlock();
    const QTextBlockFormat blockFormat = block.blockFormat();
    if (!blockFormat.boolProperty(QTextFormat::BlockNonBreakableLines)) {
        setCurrentBlockState(NoState);
        return;
    }

    const QString language = blockFormat.stringProperty(NotesRichFormat::CodeBlockLanguage).toLower();
    if (language.isEmpty() || language == QStringLiteral("auto") || language == QStringLiteral("plaintext")) {
        setCurrentBlockState(NoState);
        return;
    }

    const QTextBlock previous = block.previous();
    const bool sameCodeGroup = previous.isValid() &&
        previous.blockFormat().boolProperty(QTextFormat::BlockNonBreakableLines) &&
        blockFormat.intProperty(NotesRichFormat::CodeBlockGroup) > 0 &&
        blockFormat.intProperty(NotesRichFormat::CodeBlockGroup) ==
            previous.blockFormat().intProperty(NotesRichFormat::CodeBlockGroup) &&
        blockFormat.stringProperty(NotesRichFormat::CodeBlockLanguage) ==
            previous.blockFormat().stringProperty(NotesRichFormat::CodeBlockLanguage);
    int state = sameCodeGroup ? previousBlockState() : NoState;

    if (language == QStringLiteral("diff")) {
        if (text.startsWith(QLatin1Char('+'))) setFormat(0, text.size(), additionFormat_);
        else if (text.startsWith(QLatin1Char('-'))) setFormat(0, text.size(), deletionFormat_);
        else if (text.startsWith(QStringLiteral("@@"))) setFormat(0, text.size(), typeFormat_);
        setCurrentBlockState(NoState);
        return;
    }

    const QSet<QString> &keywords = keywordsFor(language);
    const bool hashComments = hasHashComments(language);
    const bool slashComments = hasSlashComments(language);
    const bool markupComments = hasMarkupComments(language);
    static const QRegularExpression numberPattern(QStringLiteral(
        R"((?:0[xX][0-9A-Fa-f](?:[0-9A-Fa-f_]*[0-9A-Fa-f])?|0[bB][01](?:[01_]*[01])?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?))"));

    int index = 0;
    while (index < text.size()) {
        if (state == BlockComment || state == MarkupComment || state == TripleSingleString || state == TripleDoubleString) {
            const QString terminator = state == BlockComment ? QStringLiteral("*/") :
                state == MarkupComment ? QStringLiteral("-->") :
                state == TripleSingleString ? QStringLiteral("'''") : QStringLiteral("\"\"\"");
            const int end = text.indexOf(terminator, index);
            if (end < 0) {
                setFormat(index, text.size() - index,
                          state == TripleSingleString || state == TripleDoubleString ? stringFormat_ : commentFormat_);
                setCurrentBlockState(state);
                return;
            }
            const int length = end + terminator.size() - index;
            setFormat(index, length,
                      state == TripleSingleString || state == TripleDoubleString ? stringFormat_ : commentFormat_);
            index += length;
            state = NoState;
            continue;
        }

        if (markupComments && text.mid(index, 4) == QStringLiteral("<!--")) {
            const int end = text.indexOf(QStringLiteral("-->"), index + 4);
            if (end < 0) {
                setFormat(index, text.size() - index, commentFormat_);
                setCurrentBlockState(MarkupComment);
                return;
            }
            const int length = end + 3 - index;
            setFormat(index, length, commentFormat_);
            index += length;
            continue;
        }
        if (slashComments && text.mid(index, 2) == QStringLiteral("//")) {
            setFormat(index, text.size() - index, commentFormat_);
            break;
        }
        if ((slashComments || isSql(language)) && text.mid(index, 2) == QStringLiteral("/*")) {
            const int end = text.indexOf(QStringLiteral("*/"), index + 2);
            if (end < 0) {
                setFormat(index, text.size() - index, commentFormat_);
                setCurrentBlockState(BlockComment);
                return;
            }
            const int length = end + 2 - index;
            setFormat(index, length, commentFormat_);
            index += length;
            continue;
        }
        if (isSql(language) && text.mid(index, 2) == QStringLiteral("--")) {
            setFormat(index, text.size() - index, commentFormat_);
            break;
        }
        if (hashComments && text.at(index) == QLatin1Char('#')) {
            setFormat(index, text.size() - index, commentFormat_);
            break;
        }

        const QChar ch = text.at(index);
        if (isPython(language) && (text.mid(index, 3) == QStringLiteral("'''") ||
                                   text.mid(index, 3) == QStringLiteral("\"\"\""))) {
            const bool single = ch == QLatin1Char('\'');
            const QString terminator = single ? QStringLiteral("'''") : QStringLiteral("\"\"\"");
            const int end = text.indexOf(terminator, index + 3);
            if (end < 0) {
                setFormat(index, text.size() - index, stringFormat_);
                setCurrentBlockState(single ? TripleSingleString : TripleDoubleString);
                return;
            }
            const int length = end + 3 - index;
            setFormat(index, length, stringFormat_);
            index += length;
            continue;
        }
        if (ch == QLatin1Char('\'') || ch == QLatin1Char('"') ||
            (ch == QLatin1Char('`') && (language == QStringLiteral("javascript") ||
                                        language == QStringLiteral("typescript")))) {
            const int start = index++;
            bool escaped = false;
            while (index < text.size()) {
                const QChar current = text.at(index++);
                if (escaped) escaped = false;
                else if (current == QLatin1Char('\\')) escaped = true;
                else if (current == ch) break;
            }
            setFormat(start, index - start, stringFormat_);
            continue;
        }
        if (isMarkup(language) && ch == QLatin1Char('<')) {
            static const QRegularExpression tagPattern(QStringLiteral(R"(</?[A-Za-z][A-Za-z0-9:_-]*)"));
            const auto match = tagPattern.match(text, index);
            if (match.hasMatch() && match.capturedStart() == index) {
                setFormat(index, match.capturedLength(), typeFormat_);
                index += match.capturedLength();
                continue;
            }
        }
        if (identifierStart(ch)) {
            const int start = index++;
            while (index < text.size() && identifierPart(text.at(index))) ++index;
            const QString token = text.mid(start, index - start);
            const QString normalized = isSql(language) ? token.toLower() : token;
            if (keywords.contains(normalized)) setFormat(start, index - start, keywordFormat_);
            else if (builtinTypes().contains(normalized))
                setFormat(start, index - start, typeFormat_);
            else {
                int lookahead = index;
                while (lookahead < text.size() && text.at(lookahead).isSpace()) ++lookahead;
                if (lookahead < text.size() && text.at(lookahead) == QLatin1Char('('))
                    setFormat(start, index - start, functionFormat_);
            }
            continue;
        }
        if (ch.isDigit() || (ch == QLatin1Char('.') && index + 1 < text.size() && text.at(index + 1).isDigit())) {
            const auto match = numberPattern.match(text, index);
            if (match.hasMatch() && match.capturedStart() == index) {
                setFormat(index, match.capturedLength(), numberFormat_);
                index += match.capturedLength();
                continue;
            }
        }
        ++index;
    }
    setCurrentBlockState(NoState);
}
