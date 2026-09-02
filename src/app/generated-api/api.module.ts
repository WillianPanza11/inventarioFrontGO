import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { APKsService } from './api/aPKs.service';
import { AutenticacinService } from './api/autenticacin.service';
import { DispositivosService } from './api/dispositivos.service';
import { LocalesService } from './api/locales.service';
import { MapeoDeRedService } from './api/mapeoDeRed.service';
import { ProvinciasService } from './api/provincias.service';
import { RdenesService } from './api/rdenes.service';
import { SeccionesService } from './api/secciones.service';
import { TiposDeLocalService } from './api/tiposDeLocal.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: [
    APKsService,
    AutenticacinService,
    DispositivosService,
    LocalesService,
    MapeoDeRedService,
    ProvinciasService,
    RdenesService,
    SeccionesService,
    TiposDeLocalService ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
        return {
            ngModule: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: ApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
