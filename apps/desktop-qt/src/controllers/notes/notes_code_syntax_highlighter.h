#pragma once

#include <QtGui/QSyntaxHighlighter>

class NotesCodeSyntaxHighlighter final : public QSyntaxHighlighter {
    Q_OBJECT
public:
    explicit NotesCodeSyntaxHighlighter(QTextDocument *document);

protected:
    void highlightBlock(const QString &text) override;

private:
    QTextCharFormat keywordFormat_;
    QTextCharFormat stringFormat_;
    QTextCharFormat commentFormat_;
    QTextCharFormat numberFormat_;
    QTextCharFormat functionFormat_;
    QTextCharFormat typeFormat_;
    QTextCharFormat additionFormat_;
    QTextCharFormat deletionFormat_;
};
