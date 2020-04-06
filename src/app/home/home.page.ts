import { Component, ViewChild, ElementRef } from '@angular/core';

import { Plugins } from '@capacitor/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
const { Geolocation } = Plugins;

declare var google;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  // Firebase related
  locations: Observable<any>;
  locationsCollection: AngularFirestoreCollection<any>;


  // Map related
  @ViewChild('map', { static: false }) mapElement: ElementRef;
  map: any;
  markers = [];

  user = null;
  isTracking = false;
  watch = null;


  constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {

    this.anonLogin();

  }


  ionViewWillEnter() {
    this.loadMap();
  }


  anonLogin() {

    // Log user in

    this.afAuth.auth.signInAnonymously().then(res => {

      this.user = res.user;

      console.log(this.user);

      // Create a collection to store this user's location
      // data into. If one already exists, it will be used.

      this.locationsCollection = this.afs.collection(
        `locations/${this.user.uid}/track`,
        ref => ref.orderBy('timestamp')
      );

      // load firebase data.
      // And every time the value changes, assign it to locations
      // Locations is a observable, so it will constantly
      // Be listened to with the async pipe in the view
      //this.locations = this.locationsCollection.valueChanges();
      // In order to be able to delete from firebase, we need the ID.
      // Hence each location being mapped to an object with its ID also

      this.locations = this.locationsCollection.snapshotChanges().pipe(
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );

      // As location will constantly be updated
      // We need to subscribe to it and change the postiion of the map

      this.locations.subscribe(locations => {

        console.log('New Locations: ', locations);
        this.updateMap(locations);

      });

    });

  }

  updateMap(locations) {

    // Set all markers that already exists to null

    this.markers.map(marker => marker.setMap(null));
    this.markers = [];

    // then for every location in the array of locations, create a new marker.

    for (let loc of locations) {

      // For each location in the location array
      // Create a new posotion

      let latLng = new google.maps.LatLng(loc.lat, loc.lng);

      // Create a new marker using that position

      let marker = new google.maps.Marker({

        // You have to specify which map it has to go on
        map: this.map,
        animation: google.maps.Animation.DROP,
        position: latLng
      });

      // Push the new marker into the markers array.
      this.markers.push(marker);
    }


  }


  loadMap() {

    let latLng = new google.maps.LatLng(51.9036442, 7.6673267);

    let mapOptions = {
      center: latLng,
      zoom: 5,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);
  }

  startTracking() {

    this.isTracking = true;

    // Using the geolocation plugin from capcitor

    this.watch = Geolocation.watchPosition({}, (position, err) => {

      console.log('Position is: ', position);

      if (position) {

        this.addNewLocation(

          position.coords.latitude,
          position.coords.longitude,
          position.timestamp

        );
      }

    });

  }

  stopTracking() {

    Geolocation.clearWatch({ id: this.watch }).then(() => {
      this.isTracking = false;
    });

  }

  addNewLocation(lat, lng, timestamp) {

    this.locationsCollection.add({
      lat,
      lng,
      timestamp
    });

    let position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(5);

  }

  deleteLocation(pos) {
    console.log('Delete: ', pos);
    this.locationsCollection.doc(pos.id).delete();
  }


}
