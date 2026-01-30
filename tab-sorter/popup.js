function setup($) {
  $('.btn').each(function () {
    var $button = $(this);
    var action = $(this).attr('id');
    $button.click(function (ev) {
      console.log('Action:', action);
      chrome.runtime.sendMessage(
        {
          action: 'sort',
          args: [action],
        },
        function () {
          console.log('Sort complete; closing popup');
          window.close();
        }
      );
    });
    console.log('Registered action:', action);
  });
}

jQuery(setup);
