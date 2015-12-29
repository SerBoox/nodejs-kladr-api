function getMySQLObject(mysql_table, data) {
    switch (mysql_table) {
        case('altnames'):
            return object = {
                id: data[0].id,
                oldcode: data[1].value,
                newcode: data[2].value,
                level: data[3].value
            };
            break;
        case('doma'):
            return object = {
                id: data[0].id,
                name: data[1].value,
                korp: data[2].value,
                socr: data[3].value,
                code: data[4].value,
                index: data[5].value,
                gninmb: data[6].value,
                uno: data[7].value,
                ocatd: data[8].value
            };
            break;
        case('flat'):
            return object = {
                id: data[0].id,
                code: data[1].value,
                np: data[2].value,
                gninmb: data[3].value,
                name: data[4].value,
                index: data[5].value,
                uno: data[6].value
            };
            break;
        case("kladr"):
            return object = {
                id: data[0].id,
                name: data[1].value,
                socr: data[2].value,
                code: data[3].value,
                index: data[4].value,
                gninmb: data[5].value,
                uno: data[6].value,
                ocatd: data[7].value,
                status: data[8].value
            };
            break;
        case('socrbase'):
            return object = {
                id: data[0].id,
                level: data[1].value,
                scname: data[2].value,
                socrname: data[3].value,
                kod_t_st: data[4].value
            };
            break;
        case('street'):
            return object = {
                id: data[0].id,
                name: data[1].value,
                socr: data[2].value,
                code: data[3].value,
                index: data[4].value,
                gninmb: data[5].value,
                uno: data[6].value,
                ocatd: data[7].value
            };
            break;
    }
}
module.exports = getMySQLObject
