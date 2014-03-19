$(document).ready(function() {

  // sidebar radio button logic

  $('#gasLabel').css('color', '#FFF');

  var current = 'gas';

  $( "#radio-1-1" ).click(function() {
    if (current != 'gas') {
      $('#gasLabel').css('color', '#FFF');
      $('#electricLabel').css('color', '#999');
      $('#currentViewText').text('Natural Gas');
      current = 'gas';
    }
  });

  $( "#radio-1-2" ).click(function() {
    if (current != 'electric') {
      $('#gasLabel').css('color', '#999');
      $('#electricLabel').css('color', '#FFF');
      $('#currentViewText').text('Electric');
      current = 'electric';
    }
  });

  // end sidebar radio button logic

 });