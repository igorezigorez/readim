﻿(function () {

    function splitByLineBreaks(text) {
        return text.split(/\r\n|\r|\n/g);
    }
    function containsPunctuation(word) {
        return word.match(/[^\w\s]/g);
    }

    var ViewerModel = {
        previewLineLength: 40,
        interval: 300,
        textArray: [],
        visibleLines: ko.observableArray([]),

        nextTextLine: 0,
        currentWordLine: ko.observable(0),

        currentWord: {
            lineNumber: 0,
            position: 0,
            value: ko.observable('bbbb')
        },
        previousWord: ko.observable('bbbb'),
        nextWord: ko.observable('bbbb'),


        loadText: function (content, previewLineLength) {
            this.textArray = splitTextToWords(content, previewLineLength);
        },
        startReading: function () {
            this.loadText(getFileContent(), this.previewLineLength);

            var previewLinesCount = 20;
            this.currentWordLine(6);
            this.nextTextLine = 21;

            for (var i = 0; i < previewLinesCount; i++) {
                this.visibleLines.push({
                    line: ko.observable(this.textArray[i].join(" ")),
                    words: this.textArray[i]
                });
            }

            this.currentWord.lineNumber = this.currentWordLine();
            this.currentWord.position = 1;
            this.currentWord.value(this.textArray[this.currentWordLine()][1]);

            this.backupWordInObject(this.currentWord);
            this.decorateWord(this.currentWord);
        },

        moveNext: function () {
            var word = this.currentWord;
            this.restoreWordFromObject(word);
            this.previousWord(word.value());

            this.getNextWordCoordinates(word);
            this.backupWordInObject(word);
            this.decorateWord(word);

            var nextWordPosition = word.position + 1;
            var currentLineNumber = word.lineNumber;

            this.nextWord(this.visibleLines()[currentLineNumber].words.length > nextWordPosition
                            ? this.visibleLines()[currentLineNumber].words[nextWordPosition]
                            : this.visibleLines()[currentLineNumber + 1].words[0]);

            return this.getIntervalCorrection(word.value());
        },

        getIntervalCorrection: function (word) {
            var correction = 1 + word.length / 100;
            if (word.indexOf(" ") > 0) {
                correction *= 1.18;
            }
            if (word.length > 11) {
                correction *= 1.5;
            }
            if (containsPunctuation(word) && containsPunctuation(word).length) {
                correction *= 1.18;
            }

            //console.log("word: " + word + ", correction: " + correction);
            return correction;
        },

        moveNextLine: function () {

            this.nextTextLine += 1;
            this.visibleLines.shift();
            this.visibleLines.push({
                line: ko.observable(this.textArray[this.nextTextLine].join(" ")),
                words: this.textArray[this.nextTextLine]
            });
        },

        getNextWordCoordinates: function (wordObject) {
            if (this.visibleLines()[wordObject.lineNumber].words.length <= wordObject.position + 1) {
                wordObject.position = -1;
                this.moveNextLine();
            }
            wordObject.position += 1;
        },
        decorateWord: function (wordObject) {
            var result = this.visibleLines()[wordObject.lineNumber];
            result.words[wordObject.position] = "<span>" + result.words[wordObject.position] + "</span>";
            result.line(result.words.join(" "));
        },
        backupWordInObject: function (wordObject) {
            wordObject.value(this.visibleLines()[wordObject.lineNumber].words[wordObject.position]);
        },
        restoreWordFromObject: function (wordObject) {
            var result = this.visibleLines()[wordObject.lineNumber];
            result.words[wordObject.position] = wordObject.value();
            result.line(result.words.join(" "));
        },

    };



    function splitTextToWords(text, previewLineLength) {
        var prepositionMaxLength = 2,
            wordAfterPrepositionMaxLength = 10;

        var wordsArray = [],
            wordsArrayCurrentLineLength = 0,
            wordsArrayCurrentLine,
            linesArray = splitByLineBreaks(text),
            previousWord = "longword",
            currentWord = "longword";

        for (var i = 0; i < linesArray.length; i++) {
            var lineWords = linesArray[i].split(" ");
            wordsArrayCurrentLineLength = 0;
            wordsArrayCurrentLine = [];
            for (var j = 0; j < lineWords.length; j++) {
                if (lineWords[j].length > 0) {
                    if (wordsArrayCurrentLineLength + lineWords[j].length >= previewLineLength) {
                        wordsArray.push(wordsArrayCurrentLine);
                        wordsArrayCurrentLineLength = 0;
                        wordsArrayCurrentLine = [];
                    }

                    currentWord = lineWords[j];
                    if (previousWord.length <= prepositionMaxLength && currentWord.length <= wordAfterPrepositionMaxLength && !containsPunctuation(previousWord)) {
                        wordsArrayCurrentLine[wordsArrayCurrentLine.length - 1] += " " + currentWord;
                    }
                    else {
                        wordsArrayCurrentLine.push(currentWord);
                        wordsArrayCurrentLineLength += lineWords[j].length + 1;
                    }
                    previousWord = wordsArrayCurrentLine[wordsArrayCurrentLine.length - 1];
                }
            }
            wordsArray.push(wordsArrayCurrentLine);
        }
        return wordsArray;
    }

    ko.applyBindings(ViewerModel, document.getElementById('content'));

    ViewerModel.startReading();
    //setInterval( function() { ViewerModel.moveNext.call(ViewerModel) } , ViewerModel.interval);

    function startReading() {
        var timeoutCorrection = ViewerModel.moveNext();
        //console.log(timeoutCorrection);
        setTimeout(function () { startReading(); }, ViewerModel.interval * timeoutCorrection);
    }

    startReading();


    function getFileContent() {
        return "Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only STARTHERE!!! an, action a JSON a JSON an to do. It is desighned for live of us. It is desighned for live of us. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to anActiveRecord graphandthensaveit to yourtabase. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really interesting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE staonlyreallyinteresting to Rails developers. The convention in Rails is that, when you pass into an action a JSON object graph, the framework can automatically convert it to an ActiveRecord object graph and then save it to your database. It knows which of the objects are already in your database, and issues the correct INSERT or UPDATE sta’s only really ";
    }
})();