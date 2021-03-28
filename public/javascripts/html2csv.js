jQuery.fn.table2CSV = function() {
    var data = $("#example1").first(); //Only one table
    var csvData = [];
    var tmpArr = [];
    var tmpStr = '';
    data.find("tr:visible").each(function() {
        if($(this).find("th").length) {
            $(this).find("th").each(function() {
                tmpStr = $(this).text().replace(/"/g, '""');
                tmpArr.push('"' + tmpStr + '"');
            });
            csvData.push(tmpArr);
        } else {
            tmpArr = [];
            $(this).find("td").each(function() {
                console.log($.trim($(this).html()))
                if($(this).text().match(/^-{0,1}\d*\.{0,1}\d+$/)) {
                    tmpArr.push(parseFloat($(this).text()));
                } else {
                    tmpStr = $(this).text().replace(/"/g, '""');
                    tmpArr.push('"' + tmpStr + '"');
                }
            });
            csvData.push(tmpArr.join(','));
        }
    });
    var output = csvData.join('\n');
    var uri = 'data:text/csv;charset=UTF-8,' + encodeURIComponent(output);
    window.open(uri);

}