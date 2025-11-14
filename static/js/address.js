var my_handlers = {
  fill_provinces: function() {
    var region_code = $(this).val();
    $('#region-text').val($(this).find("option:selected").text());
    $('#province-text, #city-text, #barangay-text').val('');
    let dropdown = $('#province');
    dropdown.empty().append('<option selected disabled>Choose State/Province</option>');
    $('#city, #barangay').empty().append('<option selected disabled></option>');
    $.getJSON('/static/ph-json/province.json', function(data) {
      var result = data.filter(v => v.region_code == region_code)
                       .sort((a,b) => a.province_name.localeCompare(b.province_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.province_code).text(e.province_name)));
    });
  },
  fill_cities: function() {
    var province_code = $(this).val();
    $('#province-text').val($(this).find("option:selected").text());
    $('#city-text, #barangay-text').val('');
    let dropdown = $('#city');
    dropdown.empty().append('<option selected disabled>Choose city/municipality</option>');
    $('#barangay').empty().append('<option selected disabled></option>');
    $.getJSON('/static/ph-json/city.json', function(data) {
      var result = data.filter(v => v.province_code == province_code)
                       .sort((a,b) => a.city_name.localeCompare(b.city_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.city_code).text(e.city_name)));
    });
  },
  fill_barangays: function() {
    var city_code = $(this).val();
    $('#city-text').val($(this).find("option:selected").text());
    $('#barangay-text').val('');
    let dropdown = $('#barangay');
    dropdown.empty().append('<option selected disabled>Choose barangay</option>');
    $.getJSON('/static/ph-json/barangay.json', function(data) {
      var result = data.filter(v => v.city_code == city_code)
                       .sort((a,b) => a.brgy_name.localeCompare(b.brgy_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.brgy_code).text(e.brgy_name)));
    });
  },
  onchange_barangay: function() {
    $('#barangay-text').val($(this).find("option:selected").text());
  }
};

$(function() {
  $('#region').on('change', my_handlers.fill_provinces);
  $('#province').on('change', my_handlers.fill_cities);
  $('#city').on('change', my_handlers.fill_barangays);
  $('#barangay').on('change', my_handlers.onchange_barangay);
  let dropdown = $('#region');
  dropdown.empty().append('<option selected disabled>Choose Region</option>');
  $.getJSON('/static/ph-json/region.json', function(data) {
    $.each(data, (_, e) => dropdown.append($('<option></option>').val(e.region_code).text(e.region_name)));
  });
});
