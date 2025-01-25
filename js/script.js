class navController {
  constructor() {
    this.initEventListeners();
  }

  loadContent(hash) {
    switch (hash) {
      case '#chatbot':
        $('#content').load('chatbot.html');
        break;
      case '#panduan':
        $('#content').load('panduan.html');
        break;
      default:
        $('#content').load('home.html');
    }
  }

  setActiveNav() {
    $('.nav-link').removeClass('active');
    switch (window.location.hash) {
      case '#chatbot':
        $('#nav-chatbot').addClass('active');
        break;
      case '#panduan':
        $('#nav-panduan').addClass('active');
        break;
      default:
        $('#nav-home').addClass('active');
    }
  }

  initEventListeners() {
    $(document).ready(() => {
      this.loadContent(window.location.hash);
      this.setActiveNav();

      $('#nav-home').click((e) => {
        e.preventDefault();
        window.location.hash = '#home';
        this.loadContent('#home');
      });

      $('#nav-chatbot').click((e) => {
        e.preventDefault();
        window.location.hash = '#chatbot';
        this.loadContent('#chatbot');
      });

      $('#nav-panduan').click((e) => {
        e.preventDefault();
        window.location.hash = '#panduan';
        this.loadContent('#panduan');
      });

      $('#content').on('click', '#chat', (e) => {
        e.preventDefault();
        window.location.hash = '#chatbot';
        this.loadContent('#chatbot');
      });

      $(window).on('hashchange', () => {
        this.loadContent(window.location.hash);
        this.setActiveNav();
        location.reload();
      });
    });
  }
}

new navController();
