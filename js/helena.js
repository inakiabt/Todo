// An example Parse.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the todo items and provide user authentication and sessions.

function formatDate(date)
{
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();

  return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}
$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  // Parse.initialize("app-key",
  //                  "js-key");
  Parse.initialize("6du3fMUYC9Qxw3eVBbMC23KzL18OCXKg5LFqXWzz",
                   "4ziWsluhyuwhErLiwTkm3iY4QHaCkUiLPwCeKIGN");

  // Todo Model
  // ----------

  // Our basic Todo model has `content`, `order`, and `done` attributes.
  var Product = Parse.Object.extend("Product", {
    // Default attributes for the todo.
    defaults: {
      title: "EMPTY TITLE"
    }
  });

  // Todo Collection
  // ---------------

  var ProductList = Parse.Collection.extend({

    // Reference to this collection's model.
    model: Product,

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('title');
    }

  });

  var Item = Parse.Object.extend("Item", {
    // Default attributes for the todo.
    defaults: {
      sold: false
    }

  });

  // Todo Collection
  // ---------------

  var ItemList = Parse.Collection.extend({

    // Reference to this collection's model.
    model: Item
  });

  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  var ProductView = Parse.View.extend({

    //... is a list tag.
    tagName:  "span",

    // Cache the template function for a single item.
    template: _.template($('#product-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .detail-button" : "detail"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render');
    },

    detail: function(){
      new ProductDetailView({model: this.model});
    },

    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }

  });

  // The Application
  // ---------------

  // The main view that lets a user manage their todo items
  var ManageProductsView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
    },

    el: ".products-content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'render');

      // Main todo management template
      this.$el.html(_.template($("#products-template").html()));

      // Create our collection of Todos
      this.products = new ProductList();

      // Setup the query for the collection to look for products from the current user
      this.products.query = new Parse.Query(Product);

      this.products.bind('all',         this.render);
      this.products.bind('change:sold', this.onChange);

      // Fetch all the todo items for this user
      $('.loading').show();
      this.products.fetch();

    },

    onChange: function(model) {
      this.trigger('item:change', {model: model});
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(product) {
      var view = new ProductView({model: product});
      this.$("#products-body").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#products-body").html("");
      this.products.each(this.addOne);

      // grr
      try {
        $('button.class-fanti').first().before('<h4>Fanti</h4>');
        $('button.class-helu').first().before('<h4>Helu</h4>');
        $('button.class-luli').first().before('<h4>Luli</h4>');
        $('button.class-helena').first().before('<h4>Helena</h4>');
        $('button.class-mylo').first().before('<h4>Mylo</h4>');
        $('button.class-troyita').first().before('<h4>Troyita</h4>');
      } catch (e) {
      }
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      $('.loading').hide();

      this.addAll();
      this.delegateEvents();

    }

  });

  // The DOM element for a todo item...
  var ItemView = Parse.View.extend({

    //... is a list tag.
    tagName:  "tr",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .sold-button" : "sold",
      "click .sell-button" : "sell",
      "click .undo-sold-button" : "undoSold"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render', 'sold', 'sell', 'undoSold');

      this.model.bind('sync', this.render);
    },

    sold: function() {
    },
    sell: function() {
      var model = this.model;
      $('.loading').show();
      this.model.save({
        sold: true,
        soldAt: new Date()
      }).fail(function(){
        alert('Error al guardar los datos de "' + model.get('product').get('title') + '-' + model.get('product').get('type') + '" talle ' + model.get('size') + ', intentar nuevamente luego de refrescar la pagina');
      }).done(function(){
        $('.loading').hide();
        appView.onItemChange();
      });
    },
    undoSold: function() {
      var model = this.model;
      this.model.unset('soldAt');
      this.model.unset('sold');
      $('.loading').show();
      this.model.save().fail(function(){
        alert('Error al deshacer los datos de "' + model.get('product').get('title') + '-' + model.get('product').get('type') + '" talle ' + model.get('size') + ', intentar nuevamente luego de refrescar la pagina');
      }).done(function(){
        $('.loading').hide();
        appView.onItemChange();
      });

    },
    render: function() {
      // console.log('ITEM', this.model.toJSON(), this.model.get("soldAt"));

      this.$el.removeClass('success');
      this.$el.removeClass('active');

      var item = _.extend(this.model.toJSON(), {
          sold: this.model.get("sold") === true,
          soldAt: this.model.get("soldAt") ? formatDate(this.model.get("soldAt")) : '',
          product: this.model.get('product').toJSON()
        });

      this.$el.addClass(!item.sold ? 'success' : 'active');
      this.$el.html(this.template(item));
      return this;
    }

  });

  var ProductDetailView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
    },

    el: ".product-detail-content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'render');

      // Main todo management template
      this.$el.html(_.template($("#product-detail-template").html()));

      // Create our collection of Todos
      this.items = new ItemList();

      // Setup the query for the collection to look for items from the current user
      this.items.query = new Parse.Query(Item);
      this.items.query.equalTo("product", this.model);
      this.items.query.include("product");
      this.items.query.ascending(["sold", "size"]);

      var me = this;
      // Fetch all the todo items for this user
      $('.loading').show();
      this.items.fetch().done(function(){
        me.render();
        $('.loading').hide();
      });
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(item) {
      var view = new ItemView({model: item});
      this.$("#items-body").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#items-body").html("");
      this.items.each(this.addOne);
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {

      this.addAll();
      this.delegateEvents();

    }

  });

  // The DOM element for a todo item...
  var VentasItemView = Parse.View.extend({

    //... is a list tag.
    tagName:  "tr",

    // Cache the template function for a single item.
    template: _.template($('#venta-item-template').html()),

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function(options) {
      options = options || {};
      _.bindAll(this, 'render');

      this.index = options.index;
      this.model.bind('sync', this.render);
    },

    render: function() {
      var item = _.extend(this.model.toJSON(), {
          index: this.index,
          soldAt: this.model.get("soldAt") ? formatDate(this.model.get("soldAt")) : '',
          product: this.model.get('product').toJSON()
        });

      this.$el.html(this.template(item));
      return this;
    }

  });

  var VentasTotalView = Parse.View.extend({

    //... is a list tag.
    tagName:  "tr",

    // Cache the template function for a single item.
    template: _.template($('#venta-total-template').html()),

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render');
    },

    render: function() {
      this.$el.html(this.template({total: this.model.reduce(function(memo, venta){
        return memo + venta.get('product').get('price');
      }, 0)}));
      return this;
    }

  });

  var VentasView = Parse.View.extend({

    // Delegated events for creating new items, and clearing completed ones.
    events: {
    },

    el: ".ventas-content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'render', 'refresh');

      // Main todo management template
      this.$el.html(_.template($("#ventas-template").html()));

      // Create our collection of Todos
      this.items = new ItemList;

      // Setup the query for the collection to look for items from the current user
      this.items.query = new Parse.Query(Item);
      this.items.query.equalTo("sold", true);
      this.items.query.include("product");
      this.items.query.descending("soldAt");

      this.refresh();

      this.on('refresh', this.refresh);
    },

    refresh: function(){
      var me = this;
      // Fetch all the todo items for this user
      $('.loading').show();
      this.items.fetch().done(function(){
        me.render();
        $('.loading').hide();
      });
    },
    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(item, index) {
      var view = new VentasItemView({model: item, index: item.collection.size() - index});
      this.$("#ventas-body").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#ventas-body").html("");
      this.items.each(this.addOne);
    },

    updateTotal: function(){
      this.$("#ventas-footer").html("");
      var view = new VentasTotalView({model: this.items});
      this.$("#ventas-footer").append(view.render().el);
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {

      this.addAll();
      this.updateTotal();
      this.delegateEvents();

    }

  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#helenaapp"),

    initialize: function() {
      this.render();
    },

    onItemChange: function() {
      this.ventas.trigger('refresh');
    },

    render: function() {
        new ManageProductsView();
        this.ventas = new VentasView();
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "detail": "detail",
      "undo": "undo",
      "sold": "sold"
    },

    initialize: function(options) {
    },

    detail: function() {
      state.set({ filter: "active" });
    },

    undo: function() {
      state.set({ filter: "completed" });
    },

    sold: function() {
      state.set({ filter: "completed" });
    }
  });

  new AppRouter();
  var appView = new AppView();
  Parse.history.start();
});
