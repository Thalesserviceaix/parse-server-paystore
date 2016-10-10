
var DateUtil = function (date){
    this.date = date;
}

DateUtil.prototype.getYearDay = function() { //1 - 366
  var year  = this.date.getFullYear();
  var month = this.date.getMonth();
  var day   = this.date.getDate();
  
  var offset = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  
  //l'année bissextile n'est utile qu'à partir de mars
  var bissextile = (month < 2) ? 0 : (year % 400 == 0 || (year % 4 == 0 && year % 100 != 0));
  
    return parseInt(day + offset[month] + bissextile);
}

DateUtil.prototype.getMonday = function() {
  var offset = (this.date.getDay() + 6) % 7;
  return new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate()-offset);
}

DateUtil.prototype.getWeek = function() { //1 - 53
  var year = this.date.getFullYear();
  var week;
  
  //dernier lundi de l'année
  var lastMonday = new DateUtil(new Date(year, 11, 31)).getMonday();
  
  //la date est dans la dernière semaine de l'année
  //mais cette semaine fait partie de l'année suivante
  if(this.date >= lastMonday && lastMonday.getDate() > 28) {
    week = 1;
  }
  else {
    //premier lundi de l'année
    var firstMonday = new DateUtil(new Date(year, 0, 1)).getMonday();
    
    //correction si nécessaire (le lundi se situe l'année précédente)
    if(firstMonday.getFullYear() < year) firstMonday = new DateUtil(new Date(year, 0, 8)).getMonday();
    
    //nombre de jours écoulés depuis le premier lundi
    var days = this.getYearDay() - new DateUtil(firstMonday).getYearDay();
    
    //window.alert(days);
    
    //si le nombre de jours est négatif on va chercher
    //la dernière semaine de l'année précédente (52 ou 53)
    if(days < 0) {
      week = new DateUtil(new Date(year, this.date.getMonth(), this.date.getDate()+days)).getWeek();
    }
    else {
      //numéro de la semaine
      week = 1 + parseInt(days / 7);
      
      //on ajoute une semaine si la première semaine
      //de l'année ne fait pas partie de l'année précédente
      week += (new DateUtil(new Date(year-1, 11, 31)).getMonday().getDate() > 28);
    }
  }
  
  return parseInt(week);
}


module.exports = DateUtil;