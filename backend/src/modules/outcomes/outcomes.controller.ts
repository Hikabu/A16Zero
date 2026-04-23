import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';


@Controller('outcomes')
export class OutcomesController {}
//   constructor(private readonly outcomesService: OutcomesService) {}

//   @Post()
//   create(@Body() createOutcomeDto: CreateOutcomeDto) {
//     return this.outcomesService.create(createOutcomeDto);
//   }

//   @Get()
//   findAll() {
//     return this.outcomesService.findAll();
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.outcomesService.findOne(+id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateOutcomeDto: UpdateOutcomeDto) {
//     return this.outcomesService.update(+id, updateOutcomeDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.outcomesService.remove(+id);
//   }
// }
