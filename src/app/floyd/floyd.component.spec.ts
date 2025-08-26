import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloydComponent } from './floyd.component';

describe('FloydComponent', () => {
  let component: FloydComponent;
  let fixture: ComponentFixture<FloydComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloydComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloydComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
